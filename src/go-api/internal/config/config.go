package config

import (
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
)

type Config struct {
	Port           int
	NodeAPIURL     string
	NodeAPITimeout time.Duration
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

	return Config{
		Port:           port,
		NodeAPIURL:     rawURL,
		NodeAPITimeout: time.Duration(timeoutMs) * time.Millisecond,
	}, nil
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
