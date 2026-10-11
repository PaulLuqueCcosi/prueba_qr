package config

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	defaultPort          = 8080
	defaultNodeAPIURL    = "http://localhost:8081"
	defaultNodeAPITimeMs = 5000
	defaultCORSOrigins   = "http://localhost:5173"
)

type Config struct {
	Port           int
	NodeAPIURL     string
	NodeAPITimeout time.Duration
	Auth           Auth
	CORSOrigins    []string
}

// Auth describes the Logto tenant whose access tokens are accepted.
type Auth struct {
	// Endpoint is the tenant origin without trailing slash, e.g. https://<tenant>.logto.app.
	Endpoint string
	// Issuer is `<endpoint>/oidc`, without trailing slash: Logto puts exactly this string in `iss`.
	Issuer string
	// Audience is the SPA's Logto application id, which Logto sets as the ID token `aud`.
	Audience string
	// JWKSURL is where the tenant publishes its signing keys (`<endpoint>/oidc/jwks`).
	JWKSURL string
}

// Load reads settings through getenv so it is testable without touching the process environment.
func Load(getenv func(string) string) (Config, error) {
	port, err := intVar(getenv, "PORT", defaultPort)
	if err != nil {
		return Config{}, err
	}
	if port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("PORT must be between 1 and 65535, got %d", port)
	}

	timeoutMs, err := intVar(getenv, "NODE_API_TIMEOUT_MS", defaultNodeAPITimeMs)
	if err != nil {
		return Config{}, err
	}
	if timeoutMs <= 0 {
		return Config{}, fmt.Errorf("NODE_API_TIMEOUT_MS must be a positive integer, got %d", timeoutMs)
	}

	rawURL := strings.TrimSpace(getenv("NODE_API_URL"))
	if rawURL == "" {
		rawURL = defaultNodeAPIURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return Config{}, fmt.Errorf("NODE_API_URL must be an absolute http(s) URL, got %q", rawURL)
	}

	auth, err := loadAuth(getenv)
	if err != nil {
		return Config{}, err
	}
	origins, err := loadCORSOrigins(getenv)
	if err != nil {
		return Config{}, err
	}

	return Config{
		Port:           port,
		NodeAPIURL:     rawURL,
		NodeAPITimeout: time.Duration(timeoutMs) * time.Millisecond,
		Auth:           auth,
		CORSOrigins:    origins,
	}, nil
}

// loadAuth has no defaults: running without auth settings must be impossible (fail closed).
func loadAuth(getenv func(string) string) (Auth, error) {
	raw := strings.TrimSpace(getenv("LOGTO_ENDPOINT"))
	if raw == "" {
		return Auth{}, errors.New("LOGTO_ENDPOINT is required")
	}
	// Origin only: a path or query would silently build a wrong issuer.
	u, err := url.Parse(raw)
	plainOrigin := err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != "" &&
		u.User == nil && (u.Path == "" || u.Path == "/") && u.RawQuery == "" && u.Fragment == "" && !u.ForceQuery
	if !plainOrigin {
		return Auth{}, fmt.Errorf("LOGTO_ENDPOINT must be a plain origin such as https://<tenant>.logto.app, got %q", raw)
	}
	audience := strings.TrimSpace(getenv("LOGTO_APP_ID"))
	if audience == "" {
		return Auth{}, errors.New("LOGTO_APP_ID is required")
	}
	endpoint := strings.ToLower(u.Scheme) + "://" + strings.ToLower(u.Host)
	return Auth{
		Endpoint: endpoint,
		Issuer:   endpoint + "/oidc",
		Audience: audience,
		JWKSURL:  endpoint + "/oidc/jwks",
	}, nil
}

// loadCORSOrigins refuses wildcards: the API accepts bearer tokens from browsers,
// so every allowed origin must be named.
func loadCORSOrigins(getenv func(string) string) ([]string, error) {
	raw := strings.TrimSpace(getenv("CORS_ORIGINS"))
	if raw == "" {
		raw = defaultCORSOrigins
	}
	var origins []string
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		u, err := url.Parse(item)
		plainOrigin := err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != "" && !strings.Contains(u.Host, "*") &&
			u.User == nil && (u.Path == "" || u.Path == "/") && u.RawQuery == "" && u.Fragment == "" && !u.ForceQuery
		if !plainOrigin {
			return nil, fmt.Errorf("CORS_ORIGINS entries must be plain origins like http://localhost:5173, got %q", item)
		}
		origins = append(origins, strings.ToLower(u.Scheme)+"://"+strings.ToLower(u.Host))
	}
	if len(origins) == 0 {
		return nil, errors.New("CORS_ORIGINS must contain at least one origin")
	}
	return origins, nil
}

func intVar(getenv func(string) string, name string, fallback int) (int, error) {
	raw := strings.TrimSpace(getenv(name))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer, got %q", name, raw)
	}
	return value, nil
}
