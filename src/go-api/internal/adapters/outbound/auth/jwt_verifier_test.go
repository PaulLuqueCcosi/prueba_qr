package auth_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"go-api/internal/adapters/outbound/auth"
	"go-api/internal/application"
)

const (
	testIssuer   = "https://tenant.example.test/oidc"
	testAudience = "spa-app-id"
	testKID      = "key-1"
)

// ---- helpers ---------------------------------------------------------------

func newKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	// P-384 is the curve behind ES384, the algorithm Logto signs with by default.
	key, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return key
}

func jwkJSON(pub *ecdsa.PublicKey, kid string) map[string]string {
	// Coordinates are fixed-width (48 bytes for P-384), as the JWK spec requires.
	return map[string]string{
		"kty": "EC", "use": "sig", "alg": "ES384", "crv": "P-384", "kid": kid,
		"x": base64.RawURLEncoding.EncodeToString(pub.X.FillBytes(make([]byte, 48))),
		"y": base64.RawURLEncoding.EncodeToString(pub.Y.FillBytes(make([]byte, 48))),
	}
}

// jwksServer serves a JWKS and counts requests, so tests can assert cache behavior.
func jwksServer(t *testing.T, keys ...map[string]string) (*httptest.Server, *atomic.Int32) {
	t.Helper()
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": keys})
	}))
	t.Cleanup(srv.Close)
	return srv, &hits
}

func newVerifier(t *testing.T, jwksURL string) *auth.JWTVerifier {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	verifier, err := auth.NewJWTVerifier(ctx, auth.Config{
		Issuer:             testIssuer,
		Audience:           testAudience,
		JWKSURL:            jwksURL,
		Leeway:             5 * time.Second,
		FetchTimeout:       2 * time.Second,
		UnknownKeyCooldown: time.Hour,
		RefreshInterval:    time.Hour,
	})
	if err != nil {
		t.Fatalf("NewJWTVerifier: %v", err)
	}
	return verifier
}

// claimsOverride lets each test break exactly one claim of an otherwise valid token.
func validClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss": testIssuer,
		"aud": []string{testAudience},
		"sub": "user-1",
		"iat": time.Now().Add(-time.Minute).Unix(),
		"exp": time.Now().Add(time.Hour).Unix(),
	}
}

func sign(t *testing.T, method jwt.SigningMethod, key any, kid string, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(method, claims)
	if kid != "" {
		token.Header["kid"] = kid
	}
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

func assertRejected(t *testing.T, err error, reason string) {
	t.Helper()
	if !errors.Is(err, application.ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
	var tokenErr *application.TokenError
	if !errors.As(err, &tokenErr) || tokenErr.Reason != reason {
		t.Fatalf("err = %v, want reason %q", err, reason)
	}
}

// ---- accepted tokens -------------------------------------------------------

func TestVerify_ValidToken_ReturnsSubject(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)

	claims, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, validClaims()))

	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if claims.Subject != "user-1" {
		t.Errorf("subject = %q", claims.Subject)
	}
}

func TestVerify_AudienceAsSingleStringOrAmongSeveral_IsAccepted(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	// Logto ID tokens carry the application id as a string; the JWT spec also allows a list.
	for name, aud := range map[string]any{
		"string":  testAudience,
		"several": []string{testAudience, "another-audience"},
	} {
		t.Run(name, func(t *testing.T) {
			c := validClaims()
			c["aud"] = aud
			if _, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, c)); err != nil {
				t.Fatalf("Verify: %v", err)
			}
		})
	}
}

func TestVerify_ClockSkewWithinLeeway_IsAccepted(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	c := validClaims()
	c["exp"] = time.Now().Add(-2 * time.Second).Unix()
	c["nbf"] = time.Now().Add(2 * time.Second).Unix()

	if _, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, c)); err != nil {
		t.Fatalf("a few seconds of clock skew must be tolerated: %v", err)
	}
}

func TestVerify_ManyTokensWithTheSameKey_FetchTheJWKSOnlyOnce(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, hits := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)

	for range 5 {
		if _, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, validClaims())); err != nil {
			t.Fatalf("Verify: %v", err)
		}
	}

	if got := hits.Load(); got != 1 {
		t.Errorf("JWKS fetched %d times, want 1 (cached)", got)
	}
}

// ---- rejected tokens -------------------------------------------------------

func TestVerify_InvalidTokens_AreRejectedWithAReason(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	otherKey := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)

	tests := []struct {
		name   string
		mutate func(jwt.MapClaims)
		signer *ecdsa.PrivateKey
		reason string
	}{
		{"expired", func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Minute).Unix() }, key, "expired"},
		{"not yet valid", func(c jwt.MapClaims) { c["nbf"] = time.Now().Add(time.Minute).Unix() }, key, "not_yet_valid"},
		{"wrong audience", func(c jwt.MapClaims) { c["aud"] = "https://other.example.test" }, key, "invalid_claims"},
		{"missing audience", func(c jwt.MapClaims) { delete(c, "aud") }, key, "invalid_claims"},
		{"wrong issuer", func(c jwt.MapClaims) { c["iss"] = "https://evil.example.test/oidc" }, key, "invalid_claims"},
		{"issuer with a trailing slash", func(c jwt.MapClaims) { c["iss"] = testIssuer + "/" }, key, "invalid_claims"},
		{"missing subject", func(c jwt.MapClaims) { delete(c, "sub") }, key, "invalid_claims"},
		{"empty subject", func(c jwt.MapClaims) { c["sub"] = "" }, key, "invalid_claims"},
		{"missing expiration", func(c jwt.MapClaims) { delete(c, "exp") }, key, "invalid_claims"},
		{"signed by another key under the same kid", func(jwt.MapClaims) {}, otherKey, "invalid_signature"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := validClaims()
			tt.mutate(c)

			_, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, tt.signer, testKID, c))

			assertRejected(t, err, tt.reason)
		})
	}
}

func TestVerify_AlgNone_IsRejected(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	token := sign(t, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, testKID, validClaims())

	_, err := verifier.Verify(context.Background(), token)

	assertRejected(t, err, "invalid_signature")
}

// The classic algorithm-confusion attack: HS256 signed with the public key
// bytes as the HMAC secret.
func TestVerify_HS256SignedWithThePublicKey_IsRejected(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	secret := key.PublicKey.X.Bytes()
	token := sign(t, jwt.SigningMethodHS256, secret, testKID, validClaims())

	_, err := verifier.Verify(context.Background(), token)

	assertRejected(t, err, "invalid_signature")
}

func TestVerify_UnlistedAlgorithms_AreRejected(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	key521, err := ecdsa.GenerateKey(elliptic.P521(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	_, verr := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES512, key521, testKID, validClaims()))

	assertRejected(t, verr, "invalid_signature")
}

func TestVerify_GarbageTokens_AreRejectedAsMalformed(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	valid := sign(t, jwt.SigningMethodES384, key, testKID, validClaims())

	for name, token := range map[string]string{
		"random text":      "not-a-jwt",
		"two segments":     "abc.def",
		"bad base64":       "###.###.###",
		"truncated":        valid[:len(valid)/2],
		"empty signature":  valid[:strings.LastIndex(valid, ".")+1],
		"tampered payload": strings.Replace(valid, ".", ".AAAA", 1),
	} {
		t.Run(name, func(t *testing.T) {
			_, err := verifier.Verify(context.Background(), token)
			if !errors.Is(err, application.ErrInvalidToken) {
				t.Fatalf("err = %v, want ErrInvalidToken", err)
			}
		})
	}
}

func TestVerify_UnknownKid_IsRejectedAsInvalidTokenNotKeyUnavailable(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)

	_, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, "rotated-away", validClaims()))

	assertRejected(t, err, "unknown_key")
	if errors.Is(err, application.ErrKeyUnavailable) {
		t.Error("an unknown kid is the caller's problem, not an outage")
	}
}

func TestVerify_UnknownKidFlood_RefetchesTheJWKSOnlyOncePerCooldown(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, hits := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)

	for i := range 10 {
		_, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, "unknown-"+string(rune('a'+i)), validClaims()))
		if !errors.Is(err, application.ErrInvalidToken) {
			t.Fatalf("err = %v, want ErrInvalidToken", err)
		}
	}

	// One fetch at startup plus at most one forced refresh within the cooldown.
	if got := hits.Load(); got > 2 {
		t.Errorf("JWKS fetched %d times for 10 unknown kids, want at most 2", got)
	}
}

// ---- key unavailability ----------------------------------------------------

func TestVerify_JWKSServerDown_ReturnsKeyUnavailable(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	url := srv.URL
	srv.Close()
	verifier := newVerifier(t, url)

	_, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, validClaims()))

	if !errors.Is(err, application.ErrKeyUnavailable) {
		t.Fatalf("err = %v, want ErrKeyUnavailable (fail closed)", err)
	}
	if errors.Is(err, application.ErrInvalidToken) {
		t.Error("an outage must not be reported as an invalid token")
	}
}

func TestVerify_JWKSServerReturns500_ReturnsKeyUnavailable(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(srv.Close)
	key := newKey(t)
	verifier := newVerifier(t, srv.URL)

	_, err := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, validClaims()))

	if !errors.Is(err, application.ErrKeyUnavailable) {
		t.Fatalf("err = %v, want ErrKeyUnavailable", err)
	}
}

func TestVerify_JWKSHangs_FailsWithinTheFetchTimeout(t *testing.T) {
	t.Parallel()
	release := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { <-release }))
	t.Cleanup(func() { close(release); srv.Close() })
	key := newKey(t)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	started := time.Now()
	verifier, err := auth.NewJWTVerifier(ctx, auth.Config{
		Issuer: testIssuer, Audience: testAudience, JWKSURL: srv.URL,
		Leeway: time.Second, FetchTimeout: 200 * time.Millisecond, UnknownKeyCooldown: time.Hour, RefreshInterval: time.Hour,
	})
	if err != nil {
		t.Fatalf("NewJWTVerifier: %v", err)
	}
	_, verr := verifier.Verify(context.Background(), sign(t, jwt.SigningMethodES384, key, testKID, validClaims()))

	if !errors.Is(verr, application.ErrKeyUnavailable) {
		t.Fatalf("err = %v, want ErrKeyUnavailable", verr)
	}
	if elapsed := time.Since(started); elapsed > 3*time.Second {
		t.Errorf("took %v; the fetch timeout must bound the wait", elapsed)
	}
}

func TestVerify_KeysCachedBeforeAnOutage_KeepWorking(t *testing.T) {
	t.Parallel()
	key := newKey(t)
	srv, _ := jwksServer(t, jwkJSON(&key.PublicKey, testKID))
	verifier := newVerifier(t, srv.URL)
	token := sign(t, jwt.SigningMethodES384, key, testKID, validClaims())
	if _, err := verifier.Verify(context.Background(), token); err != nil {
		t.Fatalf("warm-up: %v", err)
	}

	srv.Close()

	if _, err := verifier.Verify(context.Background(), token); err != nil {
		t.Fatalf("a cached key must survive a provider outage: %v", err)
	}
}

func TestNewJWTVerifier_MissingSettings_Fails(t *testing.T) {
	t.Parallel()
	_, err := auth.NewJWTVerifier(context.Background(), auth.Config{Issuer: testIssuer})
	if err == nil {
		t.Fatal("expected an error when audience and JWKS URL are missing")
	}
}
