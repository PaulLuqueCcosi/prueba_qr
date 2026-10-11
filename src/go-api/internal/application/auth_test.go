package application_test

import (
	"context"
	"errors"
	"testing"

	"go-api/internal/application"
)

func TestAccessToken_RoundTripsThroughContext(t *testing.T) {
	t.Parallel()
	ctx := application.WithAccessToken(context.Background(), "a.b.c")

	token, ok := application.AccessTokenFrom(ctx)

	if !ok || token != "a.b.c" {
		t.Fatalf("got (%q, %v)", token, ok)
	}
}

func TestAccessToken_AbsentOrEmpty_IsReportedAsMissing(t *testing.T) {
	t.Parallel()
	if _, ok := application.AccessTokenFrom(context.Background()); ok {
		t.Error("a bare context carries no token")
	}
	if _, ok := application.AccessTokenFrom(application.WithAccessToken(context.Background(), "")); ok {
		t.Error("an empty token must count as missing")
	}
}

func TestClaims_HasScope_MatchesWholeScopesOnly(t *testing.T) {
	t.Parallel()
	claims := application.Claims{Scopes: []string{"qr:write", "openid"}}

	if !claims.HasScope("qr:write") {
		t.Error("qr:write should be granted")
	}
	if claims.HasScope("qr") || claims.HasScope("qr:write:all") || claims.HasScope("") {
		t.Error("partial scope names must not match")
	}
}

func TestTokenError_UnwrapsToItsKindAndNamesOnlyTheReason(t *testing.T) {
	t.Parallel()
	err := error(&application.TokenError{Kind: application.ErrKeyUnavailable, Reason: "key_unavailable"})

	if !errors.Is(err, application.ErrKeyUnavailable) || errors.Is(err, application.ErrInvalidToken) {
		t.Errorf("kind not preserved: %v", err)
	}
	if err.Error() != "signing keys unavailable: key_unavailable" {
		t.Errorf("message = %q", err.Error())
	}
}
