package application

import (
	"context"
	"errors"
)

// Claims is the verified identity of a caller. There are no scopes: any
// authenticated user is authorized (Logto's Free plan has no API resources).
type Claims struct {
	Subject string
}

// TokenVerifier is an outbound port: it checks a bearer token end to end
// (signature, issuer, audience, time window). Failures must wrap ErrInvalidToken
// or ErrKeyUnavailable, ideally through *TokenError.
type TokenVerifier interface {
	Verify(ctx context.Context, token string) (Claims, error)
}

var (
	// ErrInvalidToken means the token itself is not acceptable.
	ErrInvalidToken = errors.New("invalid token")
	// ErrKeyUnavailable means the token could not be checked because the signing
	// keys could not be obtained. Callers must still fail closed.
	ErrKeyUnavailable = errors.New("signing keys unavailable")
)

// TokenError carries a short reason code that is safe to log. It never holds
// the token or any verification detail.
type TokenError struct {
	Kind   error
	Reason string
}

func (e *TokenError) Error() string { return e.Kind.Error() + ": " + e.Reason }
func (e *TokenError) Unwrap() error { return e.Kind }

type accessTokenKey struct{}

// WithAccessToken stores the caller's verified bearer token so outbound adapters
// can forward it (the downstream API validates it again). It lives here so the
// inbound and outbound adapters share it without importing each other.
func WithAccessToken(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, accessTokenKey{}, token)
}

// AccessTokenFrom returns the token stored by WithAccessToken. Treat it as a
// secret: never log it or put it in an error message.
func AccessTokenFrom(ctx context.Context) (string, bool) {
	token, ok := ctx.Value(accessTokenKey{}).(string)
	return token, ok && token != ""
}
