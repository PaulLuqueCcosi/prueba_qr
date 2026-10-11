package config_test

import (
	"strings"
	"testing"
	"time"

	"go-api/internal/config"
)

func env(vars map[string]string) func(string) string {
	return func(k string) string { return vars[k] }
}

const (
	testDomain   = "tenant.example.auth0.com"
	testAudience = "https://api.example.test"
)

// withAuth adds the mandatory Auth0 settings so each test varies only what it checks.
func withAuth(vars map[string]string) map[string]string {
	out := map[string]string{"AUTH0_DOMAIN": testDomain, "AUTH0_AUDIENCE": testAudience}
	for k, v := range vars {
		out[k] = v
	}
	return out
}

func TestLoad_NoVariables_UsesDefaults(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(nil)))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 8080 || cfg.NodeAPIURL != "http://localhost:8081" || cfg.NodeAPITimeout != 5*time.Second {
		t.Fatalf("cfg = %+v, want port 8080, http://localhost:8081, 5s", cfg)
	}
}

func TestLoad_ValidValues_AreApplied(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(map[string]string{
		"PORT":                "9090",
		"NODE_API_URL":        "https://stats.example.com:8443/base",
		"NODE_API_TIMEOUT_MS": "250",
	})))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 9090 || cfg.NodeAPIURL != "https://stats.example.com:8443/base" || cfg.NodeAPITimeout != 250*time.Millisecond {
		t.Fatalf("cfg = %+v", cfg)
	}
}

func TestLoad_BlankOrPaddedValues_AreTrimmed(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(map[string]string{"PORT": " 3000 ", "NODE_API_URL": "   "})))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 3000 || cfg.NodeAPIURL != "http://localhost:8081" {
		t.Fatalf("cfg = %+v, want port 3000 and the default URL", cfg)
	}
}

func TestLoad_BoundaryPorts_AreAccepted(t *testing.T) {
	t.Parallel()
	for _, p := range []string{"1", "65535"} {
		if _, err := config.Load(env(withAuth(map[string]string{"PORT": p}))); err != nil {
			t.Errorf("PORT=%s rejected: %v", p, err)
		}
	}
}

func TestLoad_Auth_DerivesIssuerWithTrailingSlashAndJWKSURL(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(nil)))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := config.Auth{
		Domain:   testDomain,
		Issuer:   "https://tenant.example.auth0.com/",
		Audience: testAudience,
		JWKSURL:  "https://tenant.example.auth0.com/.well-known/jwks.json",
	}
	if cfg.Auth != want {
		t.Fatalf("auth = %+v, want %+v", cfg.Auth, want)
	}
}

func TestLoad_MissingOrInvalidAuth_FailsClosed(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		vars    map[string]string
		wantMsg string
	}{
		{"no auth settings at all", map[string]string{}, "AUTH0_DOMAIN"},
		{"missing domain", map[string]string{"AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"blank domain", map[string]string{"AUTH0_DOMAIN": "  ", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"domain with scheme", map[string]string{"AUTH0_DOMAIN": "https://tenant.auth0.com", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"domain with path", map[string]string{"AUTH0_DOMAIN": "tenant.auth0.com/x", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"domain with trailing slash", map[string]string{"AUTH0_DOMAIN": "tenant.auth0.com/", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"domain with port", map[string]string{"AUTH0_DOMAIN": "tenant.auth0.com:443", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"domain without dot", map[string]string{"AUTH0_DOMAIN": "localhost", "AUTH0_AUDIENCE": testAudience}, "AUTH0_DOMAIN"},
		{"missing audience", map[string]string{"AUTH0_DOMAIN": testDomain}, "AUTH0_AUDIENCE"},
		{"blank audience", map[string]string{"AUTH0_DOMAIN": testDomain, "AUTH0_AUDIENCE": " "}, "AUTH0_AUDIENCE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := config.Load(env(tt.vars))
			if err == nil || !strings.Contains(err.Error(), tt.wantMsg) {
				t.Fatalf("err = %v, want an error naming %s", err, tt.wantMsg)
			}
		})
	}
}

func TestLoad_CORSOrigins_DefaultsToTheViteDevServer(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(nil)))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.CORSOrigins) != 1 || cfg.CORSOrigins[0] != "http://localhost:5173" {
		t.Fatalf("origins = %v", cfg.CORSOrigins)
	}
}

func TestLoad_CORSOrigins_AreSplitTrimmedAndNormalized(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(withAuth(map[string]string{
		"CORS_ORIGINS": " http://localhost:5173 , https://App.Example.com/ ,, http://127.0.0.1:3000",
	})))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []string{"http://localhost:5173", "https://app.example.com", "http://127.0.0.1:3000"}
	if strings.Join(cfg.CORSOrigins, "|") != strings.Join(want, "|") {
		t.Fatalf("origins = %v, want %v", cfg.CORSOrigins, want)
	}
}

func TestLoad_InvalidCORSOrigins_AreRejected(t *testing.T) {
	t.Parallel()
	for _, value := range []string{
		"*", "http://*.example.com", "localhost:5173", "ftp://example.com", "http://example.com/app",
		"http://example.com?x=1", "http://user@example.com", "example.com", "http://", ",",
	} {
		t.Run(value, func(t *testing.T) {
			t.Parallel()
			_, err := config.Load(env(withAuth(map[string]string{"CORS_ORIGINS": value})))
			if err == nil || !strings.Contains(err.Error(), "CORS_ORIGINS") {
				t.Fatalf("err = %v, want an error naming CORS_ORIGINS", err)
			}
		})
	}
}

func TestLoad_InvalidValues_ReturnDescriptiveError(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		vars    map[string]string
		wantMsg string
	}{
		{"non-numeric port", map[string]string{"PORT": "abc"}, "PORT"},
		{"decimal port", map[string]string{"PORT": "80.5"}, "PORT"},
		{"zero port", map[string]string{"PORT": "0"}, "PORT"},
		{"negative port", map[string]string{"PORT": "-1"}, "PORT"},
		{"port too large", map[string]string{"PORT": "65536"}, "PORT"},
		{"url without scheme", map[string]string{"NODE_API_URL": "localhost:8081"}, "NODE_API_URL"},
		{"url with unsupported scheme", map[string]string{"NODE_API_URL": "ftp://localhost"}, "NODE_API_URL"},
		{"url without host", map[string]string{"NODE_API_URL": "http://"}, "NODE_API_URL"},
		{"relative url", map[string]string{"NODE_API_URL": "/api"}, "NODE_API_URL"},
		{"unparsable url", map[string]string{"NODE_API_URL": "http://[::1"}, "NODE_API_URL"},
		{"non-numeric timeout", map[string]string{"NODE_API_TIMEOUT_MS": "fast"}, "NODE_API_TIMEOUT_MS"},
		{"zero timeout", map[string]string{"NODE_API_TIMEOUT_MS": "0"}, "NODE_API_TIMEOUT_MS"},
		{"negative timeout", map[string]string{"NODE_API_TIMEOUT_MS": "-5"}, "NODE_API_TIMEOUT_MS"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := config.Load(env(withAuth(tt.vars)))
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tt.wantMsg) {
				t.Fatalf("error %q should name %s", err, tt.wantMsg)
			}
		})
	}
}
