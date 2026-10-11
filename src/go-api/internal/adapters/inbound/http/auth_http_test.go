package http_test

import (
	"fmt"
	"io"
	"net"
	nethttp "net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	httpadapter "go-api/internal/adapters/inbound/http"
)

const validMatrixBody = `{"matrix":[[1,2],[3,4]]}`

func assertChallenge(t *testing.T, resp *nethttp.Response, want string) {
	t.Helper()
	if got := resp.Header.Get("WWW-Authenticate"); got != want {
		t.Errorf("WWW-Authenticate = %q, want %q", got, want)
	}
}

func logText(l *fakeLogger) string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return fmt.Sprintf("%+v", l.entries)
}

// ---- authentication --------------------------------------------------------

func TestPostQR_NoAuthorizationHeader_Returns401WithBareChallenge(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQRWithAuth(t, s.app, validMatrixBody, "")

	env := assertError(t, resp, body, 401, "UNAUTHORIZED")
	if env.Error.Message != "Authentication required" {
		t.Errorf("message = %q", env.Error.Message)
	}
	assertChallenge(t, resp, "Bearer")
	if s.hits() != 0 || s.verifier.callCount() != 0 {
		t.Errorf("neither node-api (%d) nor the verifier (%d) may be reached without a header", s.hits(), s.verifier.callCount())
	}
}

func TestPostQR_MalformedAuthorizationHeader_Returns401WithBareChallenge(t *testing.T) {
	t.Parallel()
	headers := []string{"Basic dXNlcjpwYXNz", "Bearer", "Bearer ", "Token " + validToken, "Bearer two tokens", validToken}
	for _, header := range headers {
		t.Run(header, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)

			resp, body := postQRWithAuth(t, s.app, validMatrixBody, header)

			assertError(t, resp, body, 401, "UNAUTHORIZED")
			assertChallenge(t, resp, "Bearer")
			if s.verifier.callCount() != 0 {
				t.Errorf("a malformed header must not reach the verifier")
			}
		})
	}
}

func TestPostQR_TokenRejectedByVerifier_Returns401WithInvalidTokenChallengeAndNoLeak(t *testing.T) {
	t.Parallel()
	tokens := []string{"forged.token.value", "key.unavailable.token", "exploding.verifier.token"}
	for _, token := range tokens {
		t.Run(token, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)

			resp, body := postQRWithAuth(t, s.app, validMatrixBody, "Bearer "+token)

			env := assertError(t, resp, body, 401, "UNAUTHORIZED")
			if env.Error.Message != "Authentication required" {
				t.Errorf("message = %q, every cause must look the same", env.Error.Message)
			}
			assertChallenge(t, resp, `Bearer error="invalid_token"`)
			for _, secret := range []string{token, "SECRET-VERIFIER-DETAIL", "signature"} {
				if strings.Contains(string(body), secret) {
					t.Errorf("response leaks %q: %s", secret, body)
				}
			}
			if s.hits() != 0 {
				t.Errorf("node-api must not be called for a rejected token")
			}
		})
	}
}

func TestPostQR_RejectedToken_LogsOnlyAReasonCode(t *testing.T) {
	t.Parallel()
	tests := []struct{ token, reason string }{
		{"forged.token.value", "invalid_signature"},
		{"key.unavailable.token", "key_unavailable"},
		{"exploding.verifier.token", "verifier_error"},
	}
	for _, tt := range tests {
		t.Run(tt.reason, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)

			postQRWithAuth(t, s.app, validMatrixBody, "Bearer "+tt.token)

			warns := s.logger.byLevel("warn")
			if len(warns) != 1 || warns[0].fields["reason"] != tt.reason {
				t.Fatalf("want one warn with reason %q, got %+v", tt.reason, warns)
			}
			text := logText(s.logger)
			if strings.Contains(text, tt.token) || strings.Contains(text, "SECRET-VERIFIER-DETAIL") {
				t.Errorf("logs leak the token or verifier detail: %s", text)
			}
		})
	}
}

func TestPostQR_BearerSchemeIsCaseInsensitive(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQRWithAuth(t, s.app, validMatrixBody, "bearer "+validToken)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
}

// ---- authorization: any authenticated user is allowed ----------------------

func TestPostQR_AnyValidToken_Returns200(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQRWithAuth(t, s.app, validMatrixBody, "Bearer "+validToken)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	if got := resp.Header.Get("WWW-Authenticate"); got != "" {
		t.Errorf("a successful response must not carry a challenge, got %q", got)
	}
}

func TestPublicRoutes_WithoutToken_AreReachable(t *testing.T) {
	t.Parallel()
	for _, path := range []string{"/health", "/docs", "/openapi.yaml"} {
		t.Run(path, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)

			resp, _ := get(t, s.app, path)

			if resp.StatusCode != 200 {
				t.Fatalf("status = %d, want 200 without a token", resp.StatusCode)
			}
			if s.verifier.callCount() != 0 {
				t.Errorf("public routes must not invoke the verifier")
			}
		})
	}
}

// ---- auth runs before the body is read -------------------------------------

func TestPostQR_UnauthenticatedBodies_AreRejectedBeforeBeingParsed(t *testing.T) {
	t.Parallel()
	bodies := map[string]string{
		"malformed JSON": `{"matrix":[[1,2]`,
		"invalid matrix": `{"matrix":[]}`,
		"empty body":     ``,
	}
	for name, payload := range bodies {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)

			resp, body := postQRWithAuth(t, s.app, payload, "")

			assertError(t, resp, body, 401, "UNAUTHORIZED")
		})
	}
}

func TestPostQR_UnauthenticatedOversizedBody_Returns401NotPayloadTooLarge(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	base := serveOnLoopback(t, s.app)
	head := strings.Join([]string{
		"POST /api/v1/qr HTTP/1.1", "Host: x", "Content-Type: application/json",
		"Content-Length: " + strconv.Itoa(1<<20+1), "Connection: close", "", "",
	}, crlf)

	resp, body := rawExchange(t, base, head, func(conn net.Conn) {
		_, _ = io.WriteString(conn, strings.Repeat("x", 64*1024))
	})

	assertError(t, resp, body, 401, "UNAUTHORIZED")
}

func TestPostQR_AuthenticatedOversizedBody_StillReturns413(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	base := serveOnLoopback(t, s.app)

	resp, body := rawExchange(t, base, requestHead("Content-Length: "+strconv.Itoa(1<<20+1)), func(conn net.Conn) {
		_, _ = io.WriteString(conn, strings.Repeat("x", 64*1024))
	})

	assertError(t, resp, body, 413, "PAYLOAD_TOO_LARGE")
}

// ---- token handling: never logged, never returned --------------------------

func TestPostQR_ValidToken_NeverAppearsInLogsOrResponse(t *testing.T) {
	t.Parallel()
	s := newStack(t, func(w nethttp.ResponseWriter, _ *nethttp.Request) { w.WriteHeader(500) })

	// 502 exercises the error-logging path too.
	resp, body := postQR(t, s.app, validMatrixBody)

	if strings.Contains(string(body), validToken) {
		t.Errorf("token echoed in the response body")
	}
	for name, values := range resp.Header {
		if strings.Contains(strings.Join(values, ","), validToken) {
			t.Errorf("token echoed in response header %s", name)
		}
	}
	if text := logText(s.logger); strings.Contains(text, validToken) {
		t.Errorf("token written to the logs: %s", text)
	}
}

// ---- token forwarding to node-api (option A) -------------------------------

func TestPostQR_ForwardsTheCallersTokenToNodeApi(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQRWithAuth(t, s.app, validMatrixBody, "Bearer "+validToken)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	if got, want := s.lastNodeAuth(), "Bearer "+validToken; got != want {
		t.Errorf("node-api received Authorization %q, want exactly the caller's %q", got, want)
	}
}

func TestPostQR_LowercaseBearerScheme_ForwardsTheNormalizedHeader(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	// The scheme is matched case-insensitively but forwarded in canonical form.
	postQRWithAuth(t, s.app, validMatrixBody, "bearer "+validToken)
	if got, want := s.lastNodeAuth(), "Bearer "+validToken; got != want {
		t.Errorf("node-api received %q, want %q", got, want)
	}
}

func TestPostQR_NodeApiRejectsForwardedToken_Returns502WithoutLeaking(t *testing.T) {
	t.Parallel()
	for _, status := range []int{401, 403} {
		t.Run(strconv.Itoa(status), func(t *testing.T) {
			t.Parallel()
			s := newStack(t, func(w nethttp.ResponseWriter, _ *nethttp.Request) {
				w.Header().Set("WWW-Authenticate", `Bearer error="invalid_token"`)
				w.WriteHeader(status)
				_, _ = io.WriteString(w, `{"error":{"code":"UPSTREAM-SECRET","message":"upstream detail"}}`)
			})

			resp, body := postQR(t, s.app, validMatrixBody)

			env := assertError(t, resp, body, 502, "UPSTREAM_UNAVAILABLE")
			assertGenericUpstreamError(t, body, env, "UPSTREAM-SECRET", "upstream detail", strconv.Itoa(status), validToken)
			assertChallenge(t, resp, "")

			errs := s.logger.byLevel("error")
			if len(errs) != 1 {
				t.Fatalf("want one error log, got %+v", errs)
			}
			cause, _ := errs[0].fields["error"].(string)
			if !strings.Contains(cause, strconv.Itoa(status)) || strings.Contains(cause, validToken) {
				t.Errorf("log cause = %q, want the upstream status and never the token", cause)
			}
		})
	}
}

// ---- CORS ------------------------------------------------------------------

func preflight(t *testing.T, s *stack, origin string) *nethttp.Response {
	t.Helper()
	req := httptest.NewRequest(nethttp.MethodOptions, "/api/v1/qr", nil)
	req.Header.Set("Origin", origin)
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	resp, body := do(t, s.app, req)
	if len(body) != 0 {
		t.Errorf("preflight body = %q, want empty", body)
	}
	return resp
}

func TestPreflight_AllowedOrigin_Returns204WithCORSHeadersWithoutAuth(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp := preflight(t, s, testOrigin)

	if resp.StatusCode != 204 {
		t.Fatalf("status = %d, want 204", resp.StatusCode)
	}
	want := map[string]string{
		"Access-Control-Allow-Origin":  testOrigin,
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Vary":                         "Origin",
	}
	for header, value := range want {
		if got := resp.Header.Get(header); got != value {
			t.Errorf("%s = %q, want %q", header, got, value)
		}
	}
	if s.verifier.callCount() != 0 {
		t.Errorf("preflight must be answered before authentication")
	}
}

func TestPreflight_DisallowedOrigin_GetsNoCORSHeaders(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp := preflight(t, s, "http://evil.example")

	if resp.StatusCode != 204 {
		t.Fatalf("status = %d, want 204", resp.StatusCode)
	}
	for _, header := range []string{"Access-Control-Allow-Origin", "Access-Control-Allow-Methods", "Access-Control-Allow-Headers"} {
		if got := resp.Header.Get(header); got != "" {
			t.Errorf("%s = %q, want none for a disallowed origin", header, got)
		}
	}
}

func TestCORS_ErrorResponsesToAllowedOrigins_CarryTheOriginHeader(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/qr", strings.NewReader(validMatrixBody))
	req.Header.Set("Origin", testOrigin)

	resp, _ := do(t, s.app, req)

	// Without it the browser would hide the 401 from the frontend.
	if resp.StatusCode != 401 {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != testOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, testOrigin)
	}
}

func TestCORS_RequestsFromDisallowedOrigins_GetNoOriginHeader(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	req := httptest.NewRequest(nethttp.MethodGet, "/health", nil)
	req.Header.Set("Origin", "http://evil.example")

	resp, _ := do(t, s.app, req)

	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin = %q, want none", got)
	}
}

func TestNewApp_WithoutTokenVerifier_PanicsAtStartup(t *testing.T) {
	t.Parallel()
	defer func() {
		if recover() == nil {
			t.Fatal("NewApp must refuse to build an unauthenticated app")
		}
	}()
	httpadapter.NewApp(httpadapter.Dependencies{Logger: &fakeLogger{}})
}
