// Package auth verifies Logto ID tokens (ES384 JWTs by default) against a remote JWKS.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"

	"go-api/internal/application"
)

// Config holds the verification rules and the JWKS cache tuning.
type Config struct {
	// Issuer must match the `iss` claim exactly (Logto: `<endpoint>/oidc`, no trailing slash).
	Issuer   string
	Audience string
	JWKSURL  string
	// Leeway absorbs small clock differences for exp/nbf.
	Leeway time.Duration
	// FetchTimeout bounds every JWKS request so a slow identity provider cannot hang callers.
	FetchTimeout time.Duration
	// UnknownKeyCooldown is the minimum gap between JWKS refetches triggered by an
	// unknown `kid`, so garbage tokens cannot be used to hammer the identity provider.
	UnknownKeyCooldown time.Duration
	// RefreshInterval is the periodic background refresh of the cached keys.
	RefreshInterval time.Duration
}

type tokenClaims struct {
	jwt.RegisteredClaims
}

// JWTVerifier implements application.TokenVerifier.
type JWTVerifier struct {
	parser  *jwt.Parser
	keys    keyfunc.Keyfunc
	fetches *fetchTracker
}

var _ application.TokenVerifier = (*JWTVerifier)(nil)

// NewJWTVerifier starts the JWKS cache; ctx ends its background refresh. A JWKS
// that is unreachable at startup does not abort: keys are fetched on demand and
// until then every token is rejected (fail closed).
func NewJWTVerifier(ctx context.Context, cfg Config) (*JWTVerifier, error) {
	if cfg.Issuer == "" || cfg.Audience == "" || cfg.JWKSURL == "" {
		return nil, errors.New("issuer, audience and JWKS URL are required")
	}
	tracker := &fetchTracker{base: http.DefaultTransport}
	tracker.ok.Store(true)

	keys, err := keyfunc.NewDefaultOverrideCtx(ctx, []string{cfg.JWKSURL}, keyfunc.Override{
		Client:            &http.Client{Transport: tracker, Timeout: cfg.FetchTimeout},
		HTTPTimeout:       cfg.FetchTimeout,
		RateLimitWaitMax:  cfg.FetchTimeout,
		RefreshInterval:   cfg.RefreshInterval,
		RefreshUnknownKID: rate.NewLimiter(rate.Every(cfg.UnknownKeyCooldown), 1),
		// Failures are surfaced per request as key_unavailable; the library's
		// default handler would write unstructured text to the process log.
		RefreshErrorHandlerFunc: func(string) func(context.Context, error) {
			return func(context.Context, error) {}
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create JWKS cache: %w", err)
	}

	parser := jwt.NewParser(
		// Asymmetric algorithms only (Logto signs with ES384 by default): blocks "none"
		// and HS256-signed-with-the-public-key confusion attacks.
		jwt.WithValidMethods([]string{"ES384", "ES256", "RS256"}),
		jwt.WithIssuer(cfg.Issuer),
		jwt.WithAudience(cfg.Audience),
		jwt.WithLeeway(cfg.Leeway),
		jwt.WithExpirationRequired(),
	)
	return &JWTVerifier{parser: parser, keys: keys, fetches: tracker}, nil
}

func (v *JWTVerifier) Verify(ctx context.Context, token string) (application.Claims, error) {
	var claims tokenClaims
	if _, err := v.parser.ParseWithClaims(token, &claims, v.keys.KeyfuncCtx(ctx)); err != nil {
		return application.Claims{}, v.classify(err)
	}
	// Logto always sets `sub`; a token without identity is not accepted.
	if claims.Subject == "" {
		return application.Claims{}, rejected("invalid_claims")
	}
	return application.Claims{Subject: claims.Subject}, nil
}

func (v *JWTVerifier) classify(err error) error {
	switch {
	case errors.Is(err, jwt.ErrTokenExpired):
		return rejected("expired")
	case errors.Is(err, jwt.ErrTokenNotValidYet):
		return rejected("not_yet_valid")
	case errors.Is(err, jwt.ErrTokenInvalidAudience),
		errors.Is(err, jwt.ErrTokenInvalidIssuer),
		errors.Is(err, jwt.ErrTokenRequiredClaimMissing),
		errors.Is(err, jwt.ErrTokenInvalidClaims):
		return rejected("invalid_claims")
	case errors.Is(err, jwt.ErrTokenMalformed):
		return rejected("malformed")
	case errors.Is(err, jwt.ErrTokenSignatureInvalid):
		return rejected("invalid_signature")
	case errors.Is(err, jwt.ErrTokenUnverifiable):
		// The key lookup failed. If the last JWKS fetch failed the cause is the
		// identity provider; otherwise the token names a key we do not have.
		if !v.fetches.ok.Load() {
			return &application.TokenError{Kind: application.ErrKeyUnavailable, Reason: "key_unavailable"}
		}
		return rejected("unknown_key")
	}
	return rejected("malformed")
}

func rejected(reason string) error {
	return &application.TokenError{Kind: application.ErrInvalidToken, Reason: reason}
}

// fetchTracker remembers whether the latest JWKS request succeeded, which the
// key cache does not expose, to tell "unknown kid" apart from "provider down".
type fetchTracker struct {
	base http.RoundTripper
	ok   atomic.Bool
}

func (t *fetchTracker) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := t.base.RoundTrip(req)
	t.ok.Store(err == nil && resp.StatusCode == http.StatusOK)
	return resp, err
}
