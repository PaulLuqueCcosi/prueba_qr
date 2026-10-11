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

func TestLoad_NoVariables_UsesDefaults(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(nil))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 8080 || cfg.NodeAPIURL != "http://localhost:8081" || cfg.NodeAPITimeout != 5*time.Second {
		t.Fatalf("cfg = %+v, want port 8080, http://localhost:8081, 5s", cfg)
	}
}

func TestLoad_ValidValues_AreApplied(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(map[string]string{
		"PORT":                "9090",
		"NODE_API_URL":        "https://stats.example.com:8443/base",
		"NODE_API_TIMEOUT_MS": "250",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 9090 || cfg.NodeAPIURL != "https://stats.example.com:8443/base" || cfg.NodeAPITimeout != 250*time.Millisecond {
		t.Fatalf("cfg = %+v", cfg)
	}
}

func TestLoad_BlankOrPaddedValues_AreTrimmed(t *testing.T) {
	t.Parallel()
	cfg, err := config.Load(env(map[string]string{"PORT": " 3000 ", "NODE_API_URL": "   "}))
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
		if _, err := config.Load(env(map[string]string{"PORT": p})); err != nil {
			t.Errorf("PORT=%s rejected: %v", p, err)
		}
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
			_, err := config.Load(env(tt.vars))
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tt.wantMsg) {
				t.Fatalf("error %q should name %s", err, tt.wantMsg)
			}
		})
	}
}
