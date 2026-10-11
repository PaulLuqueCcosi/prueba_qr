package http_test

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	nethttp "net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	httpadapter "go-api/internal/adapters/inbound/http"
	"go-api/internal/adapters/outbound/gonumqr"
	"go-api/internal/adapters/outbound/nodeapi"
	"go-api/internal/application"
)

const nodeStatsJSON = `{"max":167,"min":-68,"average":3.25,"sum":99,"isDiagonal":{"original":false,"q":false,"r":true},"anyDiagonal":true}`

// ---- fakes -----------------------------------------------------------------

type logEntry struct {
	level   string
	message string
	fields  application.Fields
}

type fakeLogger struct {
	mu      sync.Mutex
	entries []logEntry
}

func (l *fakeLogger) record(level, msg string, f application.Fields) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.entries = append(l.entries, logEntry{level, msg, f})
}
func (l *fakeLogger) Info(m string, f application.Fields)  { l.record("info", m, f) }
func (l *fakeLogger) Warn(m string, f application.Fields)  { l.record("warn", m, f) }
func (l *fakeLogger) Error(m string, f application.Fields) { l.record("error", m, f) }

func (l *fakeLogger) byLevel(level string) []logEntry {
	l.mu.Lock()
	defer l.mu.Unlock()
	var out []logEntry
	for _, e := range l.entries {
		if e.level == level {
			out = append(out, e)
		}
	}
	return out
}

// ---- fake token verifier ---------------------------------------------------

const (
	validToken = "valid.token"
	testOrigin = "http://localhost:5173"
)

// fakeVerifier stands in for the JWT adapter: the HTTP layer only cares about
// the outcome (claims or typed error), not how the token was checked.
type fakeVerifier struct {
	mu    sync.Mutex
	calls int
}

func (f *fakeVerifier) Verify(_ context.Context, token string) (application.Claims, error) {
	f.mu.Lock()
	f.calls++
	f.mu.Unlock()
	switch token {
	case validToken:
		return application.Claims{Subject: "user|1"}, nil
	case "key.unavailable.token":
		return application.Claims{}, &application.TokenError{Kind: application.ErrKeyUnavailable, Reason: "key_unavailable"}
	case "exploding.verifier.token":
		return application.Claims{}, errors.New("verifier internals: SECRET-VERIFIER-DETAIL")
	}
	return application.Claims{}, &application.TokenError{Kind: application.ErrInvalidToken, Reason: "invalid_signature"}
}

func (f *fakeVerifier) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

type panickingUseCase struct{ value any }

func (p panickingUseCase) Execute(context.Context, [][]float64) (application.QRResult, error) {
	panic(p.value)
}

// ---- harness ---------------------------------------------------------------

// stack wires the real use case and real gonumqr against a fake node-api.
type stack struct {
	app      *fiber.App
	logger   *fakeLogger
	verifier *fakeVerifier
	nodeURL  string
	mu       sync.Mutex
	nodeHits int
	nodeBody []byte
	// nodeAuth is the Authorization header node-api received on its last call.
	nodeAuth string
}

func newStack(t *testing.T, nodeHandler nethttp.HandlerFunc) *stack {
	t.Helper()
	s := &stack{logger: &fakeLogger{}, verifier: &fakeVerifier{}}

	if nodeHandler == nil {
		nodeHandler = func(w nethttp.ResponseWriter, _ *nethttp.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, nodeStatsJSON)
		}
	}
	node := httptest.NewServer(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		body, _ := io.ReadAll(r.Body)
		s.mu.Lock()
		s.nodeHits++
		s.nodeBody = body
		s.nodeAuth = r.Header.Get("Authorization")
		s.mu.Unlock()
		nodeHandler(w, r)
	}))
	t.Cleanup(node.Close)
	s.nodeURL = node.URL

	s.app = s.buildApp(t, node.URL)
	return s
}

func (s *stack) buildApp(t *testing.T, nodeURL string) *fiber.App {
	t.Helper()
	client, err := nodeapi.NewStatisticsClient(nodeURL, 2*time.Second)
	if err != nil {
		t.Fatalf("NewStatisticsClient: %v", err)
	}
	return httpadapter.NewApp(httpadapter.Dependencies{
		FactorizeMatrix: application.NewFactorizeMatrix(gonumqr.New(), client),
		Logger:          s.logger,
		TokenVerifier:   s.verifier,
		CORSOrigins:     []string{testOrigin},
	})
}

func (s *stack) hits() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.nodeHits
}

func (s *stack) lastNodeAuth() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.nodeAuth
}

func (s *stack) lastNodeBody() []byte {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.nodeBody
}

func do(t *testing.T, app *fiber.App, req *nethttp.Request) (*nethttp.Response, []byte) {
	t.Helper()
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 10 * time.Second, FailOnTimeout: true})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	t.Cleanup(func() { _ = resp.Body.Close() })
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp, body
}

// postQR sends an authorized request; use postQRWithAuth for other credentials.
func postQR(t *testing.T, app *fiber.App, body string) (*nethttp.Response, []byte) {
	t.Helper()
	return postQRWithAuth(t, app, body, "Bearer "+validToken)
}

// postQRWithAuth sends the header as is; an empty value omits it.
func postQRWithAuth(t *testing.T, app *fiber.App, body, authorization string) (*nethttp.Response, []byte) {
	t.Helper()
	req := httptest.NewRequest(nethttp.MethodPost, "/api/v1/qr", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	return do(t, app, req)
}

func get(t *testing.T, app *fiber.App, path string) (*nethttp.Response, []byte) {
	t.Helper()
	return do(t, app, httptest.NewRequest(nethttp.MethodGet, path, nil))
}

type errorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// assertError verifies status, code and the strict {error:{code,message}} shape.
func assertError(t *testing.T, resp *nethttp.Response, body []byte, status int, code string) errorEnvelope {
	t.Helper()
	if resp.StatusCode != status {
		t.Fatalf("status = %d, want %d (body: %s)", resp.StatusCode, status, body)
	}
	assertJSONContentType(t, resp)

	var top map[string]json.RawMessage
	if err := json.Unmarshal(body, &top); err != nil || len(top) != 1 || top["error"] == nil {
		t.Fatalf("body %s must be an object with the single key \"error\"", body)
	}
	var inner map[string]json.RawMessage
	_ = json.Unmarshal(top["error"], &inner)
	if len(inner) != 2 || inner["code"] == nil || inner["message"] == nil {
		t.Fatalf("error %s must have exactly code and message", top["error"])
	}
	var env errorEnvelope
	_ = json.Unmarshal(body, &env)
	if env.Error.Code != code {
		t.Fatalf("code = %q, want %q", env.Error.Code, code)
	}
	if env.Error.Message == "" {
		t.Fatal("error message must not be empty")
	}
	return env
}

func assertJSONContentType(t *testing.T, resp *nethttp.Response) {
	t.Helper()
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("Content-Type = %q, want application/json", ct)
	}
}

type qrBody struct {
	Original   [][]float64    `json:"original"`
	Q          [][]float64    `json:"q"`
	R          [][]float64    `json:"r"`
	Statistics map[string]any `json:"statistics"`
}

func decodeQR(t *testing.T, body []byte) qrBody {
	t.Helper()
	var out qrBody
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatalf("decode %s: %v", body, err)
	}
	return out
}

func assertDims(t *testing.T, name string, m [][]float64, rows, cols int) {
	t.Helper()
	if len(m) != rows {
		t.Fatalf("%s has %d rows, want %d", name, len(m), rows)
	}
	for i, row := range m {
		if len(row) != cols {
			t.Fatalf("%s row %d has %d cols, want %d", name, i, len(row), cols)
		}
	}
}

// serveOnLoopback exposes the app on an ephemeral port, for behavior app.Test
// cannot reproduce (chunked bodies have no declared length there).
func serveOnLoopback(t *testing.T, app *fiber.App) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("loopback listener unavailable: %v", err)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		_ = app.Listener(ln, fiber.ListenConfig{DisableStartupMessage: true})
	}()
	t.Cleanup(func() {
		_ = app.ShutdownWithTimeout(2 * time.Second)
		<-done
	})
	return "http://" + ln.Addr().String()
}

// ---- POST /api/v1/qr: success ----------------------------------------------

func TestPostQR_SquareMatrix_Returns200WithOriginalQRAndNodeStatistics(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQR(t, s.app, `{"matrix":[[12,-51,4],[6,167,-68],[-4,24,-41]]}`)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	assertJSONContentType(t, resp)
	got := decodeQR(t, body)
	assertDims(t, "original", got.Original, 3, 3)
	assertDims(t, "q", got.Q, 3, 3)
	assertDims(t, "r", got.R, 3, 3)
	if got.Original[1][1] != 167 {
		t.Errorf("original not echoed: %v", got.Original)
	}

	var want map[string]any
	_ = json.Unmarshal([]byte(nodeStatsJSON), &want)
	gotJSON, _ := json.Marshal(got.Statistics)
	wantJSON, _ := json.Marshal(want)
	if string(gotJSON) != string(wantJSON) {
		t.Errorf("statistics = %s, want exactly what node-api returned: %s", gotJSON, wantJSON)
	}
}

func TestPostQR_WideMatrix_Returns200WithQSquareAndRRectangular(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQR(t, s.app, `{"matrix":[[1,2,3],[4,5,6]]}`)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	got := decodeQR(t, body)
	assertDims(t, "original", got.Original, 2, 3)
	assertDims(t, "q", got.Q, 2, 2)
	assertDims(t, "r", got.R, 2, 3)
}

func TestPostQR_TallMatrix_Returns200WithQSquareAndRRectangular(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQR(t, s.app, `{"matrix":[[1],[2],[3]]}`)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	got := decodeQR(t, body)
	assertDims(t, "q", got.Q, 3, 3)
	assertDims(t, "r", got.R, 3, 1)
}

func TestPostQR_ValidRequest_SendsOriginalQAndRToNodeApi(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	postQR(t, s.app, `{"matrix":[[1,2],[3,4]]}`)

	var sent struct {
		Matrices map[string][][]float64 `json:"matrices"`
	}
	raw := s.lastNodeBody()
	if err := json.Unmarshal(raw, &sent); err != nil {
		t.Fatalf("node-api received invalid JSON %q: %v", raw, err)
	}
	if len(sent.Matrices) != 3 {
		t.Fatalf("node-api matrices keys = %v, want original, q, r", sent.Matrices)
	}
	assertDims(t, "sent q", sent.Matrices["q"], 2, 2)
	assertDims(t, "sent r", sent.Matrices["r"], 2, 2)
	if sent.Matrices["original"][1][0] != 3 {
		t.Errorf("sent original = %v", sent.Matrices["original"])
	}
}

// ---- POST /api/v1/qr: client errors ----------------------------------------

func TestPostQR_InvalidMatrixBodies_Return422InvalidMatrixWithoutCallingNodeApi(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, body string }{
		{"empty matrix", `{"matrix":[]}`},
		{"empty row", `{"matrix":[[]]}`},
		{"ragged rows", `{"matrix":[[1,2],[3]]}`},
		{"string element", `{"matrix":[[1,"a"]]}`},
		{"null element", `{"matrix":[[1,null]]}`},
		{"number out of float64 range", `{"matrix":[[1e999]]}`},
		{"row is not an array", `{"matrix":[1,2]}`},
		{"matrix is a string", `{"matrix":"abc"}`},
		{"matrix is a number", `{"matrix":5}`},
		{"matrix is an object", `{"matrix":{}}`},
		{"matrix is null", `{"matrix":null}`},
		{"matrix missing", `{}`},
		{"other field only", `{"data":[[1]]}`},
		{"top-level array", `[[1,2],[3,4]]`},
		{"top-level string", `"matrix"`},
		{"top-level null", `null`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)
			resp, body := postQR(t, s.app, tt.body)
			assertError(t, resp, body, 422, "INVALID_MATRIX")
			if s.hits() != 0 {
				t.Errorf("node-api was called %d times for an invalid matrix", s.hits())
			}
		})
	}
}

func TestPostQR_MalformedOrEmptyBody_Returns400InvalidJSON(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, body string }{
		{"truncated JSON", `{"matrix":[[1,2]`},
		{"not JSON", `not json`},
		{"trailing comma", `{"matrix":[[1,2],]}`},
		{"empty body", ``},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)
			resp, body := postQR(t, s.app, tt.body)
			assertError(t, resp, body, 400, "INVALID_JSON")
		})
	}
}

func TestPostQR_NonFiniteResult_Returns422NonFiniteResult(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := postQR(t, s.app, `{"matrix":[[1e308,1e308],[1e308,1e308]]}`)

	assertError(t, resp, body, 422, "NON_FINITE_RESULT")
	if s.hits() != 0 {
		t.Errorf("node-api was called %d times; non-finite values must never be sent upstream", s.hits())
	}
}

// ---- payload size ----------------------------------------------------------

func oversizedBody() string {
	// Valid JSON followed by padding, so only the size can cause the rejection.
	return `{"matrix":[[1]],"pad":"` + strings.Repeat("x", 1<<20) + `"}`
}

// rawExchange speaks HTTP/1.1 over a plain socket. Rejecting an oversized upload
// makes the server close while body bytes are still unread, and the resulting TCP
// reset can swallow the already-sent 413 on Windows. That is a transport race, not
// application behavior, so only a lost response is retried; any response that does
// arrive must be the expected one and is returned for assertions.
func rawExchange(t *testing.T, base, head string, afterHead func(conn net.Conn)) (*nethttp.Response, []byte) {
	t.Helper()
	const attempts = 8
	var lastErr error
	for range attempts {
		resp, body, err := rawAttempt(base, head, afterHead)
		if err == nil {
			t.Cleanup(func() { _ = resp.Body.Close() })
			return resp, body
		}
		lastErr = err
	}
	t.Fatalf("no response after %d attempts: %v", attempts, lastErr)
	return nil, nil
}

func rawAttempt(base, head string, afterHead func(conn net.Conn)) (*nethttp.Response, []byte, error) {
	conn, err := net.DialTimeout("tcp", strings.TrimPrefix(base, "http://"), 5*time.Second)
	if err != nil {
		return nil, nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))

	if _, err := io.WriteString(conn, head); err != nil {
		return nil, nil, err
	}
	if afterHead != nil {
		afterHead(conn)
	}
	resp, err := nethttp.ReadResponse(bufio.NewReader(conn), nil)
	if err != nil {
		return nil, nil, err
	}
	body, err := io.ReadAll(resp.Body)
	return resp, body, err
}

const crlf = "\r\n"

func requestHead(framingHeader string) string {
	return strings.Join([]string{
		"POST /api/v1/qr HTTP/1.1",
		"Host: x",
		"Content-Type: application/json",
		"Authorization: Bearer " + validToken,
		framingHeader,
		"Connection: close",
		"", "",
	}, crlf)
}

func TestPostQR_DeclaredContentLengthOverOneMB_Returns413WithoutReadingTheWholeBody(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	base := serveOnLoopback(t, s.app)
	head := requestHead("Content-Length: " + strconv.Itoa(1<<20+1))

	// fasthttp only invokes the handler once some body bytes arrive, so send a
	// small prefix; the rest of the declared megabyte is never sent.
	resp, body := rawExchange(t, base, head, func(conn net.Conn) {
		_, _ = io.WriteString(conn, strings.Repeat("x", 64*1024))
	})

	assertError(t, resp, body, 413, "PAYLOAD_TOO_LARGE")
	if s.hits() != 0 {
		t.Errorf("node-api was called for an oversized body")
	}
}

func TestPostQR_BodyExactlyAtTheLimit_IsAccepted(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	prefix := `{"matrix":[[1]],"pad":"`
	suffix := `"}`
	body := prefix + strings.Repeat("x", (1<<20)-len(prefix)-len(suffix)) + suffix

	resp, out := postQR(t, s.app, body)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, want 200 for a body of exactly 1 MiB (%s)", resp.StatusCode, out)
	}
}

// An io.Pipe reader has unknown length, which makes net/http send
// Transfer-Encoding: chunked, i.e. no declared Content-Length to trust.
func chunkedPost(t *testing.T, baseURL, payload string) (*nethttp.Response, []byte) {
	t.Helper()
	pr, pw := io.Pipe()
	go func() {
		_, _ = io.Copy(pw, strings.NewReader(payload))
		_ = pw.Close()
	}()
	req, err := nethttp.NewRequest(nethttp.MethodPost, baseURL+"/api/v1/qr", pr)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+validToken)

	resp, err := (&nethttp.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	t.Cleanup(func() { _ = resp.Body.Close() })
	body, _ := io.ReadAll(resp.Body)
	return resp, body
}

// Chunked bodies declare no length, so the limit can only be enforced by counting bytes.
func TestPostQR_ChunkedBodyOverOneMB_Returns413(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	base := serveOnLoopback(t, s.app)
	head := requestHead("Transfer-Encoding: chunked")

	resp, body := rawExchange(t, base, head, func(conn net.Conn) {
		// Write errors are ignored on purpose: the server may answer and close early.
		chunk := strings.Repeat("x", 1<<20+1)
		_, _ = io.WriteString(conn, strconv.FormatInt(int64(len(chunk)), 16)+crlf+chunk+crlf+"0"+crlf+crlf)
	})

	assertError(t, resp, body, 413, "PAYLOAD_TOO_LARGE")
	if s.hits() != 0 {
		t.Errorf("node-api was called for an oversized body")
	}
}

func TestPostQR_SmallChunkedBody_IsAccepted(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)
	base := serveOnLoopback(t, s.app)

	resp, body := chunkedPost(t, base, `{"matrix":[[1,2],[3,4]]}`)

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d, body %s", resp.StatusCode, body)
	}
	assertDims(t, "q", decodeQR(t, body).Q, 2, 2)
}

// ---- upstream failures -----------------------------------------------------

func assertGenericUpstreamError(t *testing.T, body []byte, env errorEnvelope, forbidden ...string) {
	t.Helper()
	for _, f := range forbidden {
		if strings.Contains(string(body), f) {
			t.Errorf("response leaks %q: %s", f, body)
		}
	}
	if env.Error.Message != "Statistics service is unavailable" {
		t.Errorf("message = %q, want the generic upstream message", env.Error.Message)
	}
}

func TestPostQR_NodeApiReturns500_Returns502UpstreamUnavailableWithoutLeaking(t *testing.T) {
	t.Parallel()
	s := newStack(t, func(w nethttp.ResponseWriter, _ *nethttp.Request) {
		w.WriteHeader(500)
		_, _ = io.WriteString(w, "secret upstream stack trace")
	})

	resp, body := postQR(t, s.app, `{"matrix":[[1,2],[3,4]]}`)

	env := assertError(t, resp, body, 502, "UPSTREAM_UNAVAILABLE")
	assertGenericUpstreamError(t, body, env, "secret upstream stack trace", s.nodeURL, "500")
}

func TestPostQR_NodeApiDown_Returns502UpstreamUnavailableWithoutLeaking(t *testing.T) {
	t.Parallel()
	dead := httptest.NewServer(nethttp.NotFoundHandler())
	deadURL := dead.URL
	dead.Close()
	s := &stack{logger: &fakeLogger{}, verifier: &fakeVerifier{}}
	s.app = s.buildApp(t, deadURL)

	resp, body := postQR(t, s.app, `{"matrix":[[1,2],[3,4]]}`)

	env := assertError(t, resp, body, 502, "UPSTREAM_UNAVAILABLE")
	assertGenericUpstreamError(t, body, env, deadURL, "refused", "dial", "127.0.0.1")
}

func TestPostQR_NodeApiReturnsMalformedJSON_Returns502UpstreamUnavailable(t *testing.T) {
	t.Parallel()
	s := newStack(t, func(w nethttp.ResponseWriter, _ *nethttp.Request) {
		_, _ = io.WriteString(w, "<html>not json</html>")
	})

	resp, body := postQR(t, s.app, `{"matrix":[[1,2],[3,4]]}`)

	assertError(t, resp, body, 502, "UPSTREAM_UNAVAILABLE")
}

// ---- unexpected errors -----------------------------------------------------

func TestPostQR_UseCasePanics_Returns500InternalErrorWithoutLeakingPanicMessage(t *testing.T) {
	t.Parallel()
	logger := &fakeLogger{}
	app := httpadapter.NewApp(httpadapter.Dependencies{
		FactorizeMatrix: panickingUseCase{value: "kaboom: secret internals"},
		Logger:          logger,
		TokenVerifier:   &fakeVerifier{},
	})

	resp, body := postQR(t, app, `{"matrix":[[1]]}`)

	env := assertError(t, resp, body, 500, "INTERNAL_ERROR")
	if strings.Contains(string(body), "kaboom") || strings.Contains(string(body), "secret") {
		t.Errorf("panic message leaked to the client: %s", body)
	}
	if env.Error.Message != "Unexpected error" {
		t.Errorf("message = %q", env.Error.Message)
	}

	errs := logger.byLevel("error")
	if len(errs) != 1 {
		t.Fatalf("expected one error log, got %+v", errs)
	}
	if cause, _ := errs[0].fields["error"].(string); !strings.Contains(cause, "kaboom") {
		t.Errorf("the panic cause belongs in the server log, got %q", cause)
	}
	reqs := logger.byLevel("info")
	if len(reqs) != 1 || reqs[0].fields["status"] != 500 {
		t.Errorf("request log must record the final status 500, got %+v", reqs)
	}
}

func TestPostQR_UseCasePanicsWithAnError_StillReturns500(t *testing.T) {
	t.Parallel()
	app := httpadapter.NewApp(httpadapter.Dependencies{
		FactorizeMatrix: panickingUseCase{value: io.ErrUnexpectedEOF},
		Logger:          &fakeLogger{},
		TokenVerifier:   &fakeVerifier{},
	})

	resp, body := postQR(t, app, `{"matrix":[[1]]}`)

	assertError(t, resp, body, 500, "INTERNAL_ERROR")
}

// ---- other routes ----------------------------------------------------------

func TestUnknownRoutesAndMethods_Return404NotFound(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, method, path string }{
		{"unknown GET", nethttp.MethodGet, "/nope"},
		{"unknown POST", nethttp.MethodPost, "/api/v1/unknown"},
		{"GET on the POST-only qr route", nethttp.MethodGet, "/api/v1/qr"},
		{"PUT on the qr route", nethttp.MethodPut, "/api/v1/qr"},
		{"POST on health", nethttp.MethodPost, "/health"},
		{"root", nethttp.MethodGet, "/"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)
			resp, body := do(t, s.app, httptest.NewRequest(tt.method, tt.path, nil))
			assertError(t, resp, body, 404, "NOT_FOUND")
		})
	}
}

func TestGetHealth_Returns200Ok(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := get(t, s.app, "/health")

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	assertJSONContentType(t, resp)
	if strings.ReplaceAll(string(body), " ", "") != `{"status":"ok"}` {
		t.Fatalf("body = %s", body)
	}
}

func TestGetOpenAPI_Returns200YAMLDescribingTheRoutes(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := get(t, s.app, "/openapi.yaml")

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "yaml") {
		t.Errorf("Content-Type = %q, want a YAML type", ct)
	}
	// No YAML parser is in the module graph, so check the top-level structure instead.
	spec := string(body)
	for _, want := range []string{"openapi: 3.0", "\ninfo:", "\npaths:", "/api/v1/qr:", "/health:", "bearerAuth:", "UNAUTHORIZED"} {
		if !strings.Contains(spec, want) {
			t.Errorf("spec is missing %q", want)
		}
	}
	if trimmed := strings.TrimSpace(spec); strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "<") {
		t.Error("spec should be YAML, not JSON or HTML")
	}
}

func TestGetDocs_Returns200HTMLReferencingTheSpec(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	resp, body := get(t, s.app, "/docs")

	if resp.StatusCode != 200 {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Errorf("Content-Type = %q, want text/html", ct)
	}
	if !bytes.Contains(body, []byte("/openapi.yaml")) || !bytes.Contains(body, []byte("swagger-ui")) {
		t.Errorf("docs page must load Swagger UI pointed at /openapi.yaml")
	}
}

// ---- request logging -------------------------------------------------------

func TestRequestLogging_EachRequest_LogsExactlyOneInfoEntryWithFinalStatus(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		run        func(t *testing.T, s *stack)
		wantMethod string
		wantPath   string
		wantStatus int
	}{
		{"success", func(t *testing.T, s *stack) { postQR(t, s.app, `{"matrix":[[1,2],[3,4]]}`) }, "POST", "/api/v1/qr", 200},
		{"invalid matrix", func(t *testing.T, s *stack) { postQR(t, s.app, `{"matrix":[]}`) }, "POST", "/api/v1/qr", 422},
		{"invalid json", func(t *testing.T, s *stack) { postQR(t, s.app, `{`) }, "POST", "/api/v1/qr", 400},
		{"not found", func(t *testing.T, s *stack) { get(t, s.app, "/missing") }, "GET", "/missing", 404},
		{"health", func(t *testing.T, s *stack) { get(t, s.app, "/health") }, "GET", "/health", 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s := newStack(t, nil)
			tt.run(t, s)

			entries := s.logger.byLevel("info")
			if len(entries) != 1 {
				t.Fatalf("info entries = %d, want 1: %+v", len(entries), entries)
			}
			e := entries[0]
			if e.message != "request" {
				t.Errorf("message = %q", e.message)
			}
			if e.fields["method"] != tt.wantMethod || e.fields["path"] != tt.wantPath || e.fields["status"] != tt.wantStatus {
				t.Errorf("fields = %+v, want %s %s %d", e.fields, tt.wantMethod, tt.wantPath, tt.wantStatus)
			}
			if d, ok := e.fields["durationMs"].(float64); !ok || d < 0 {
				t.Errorf("durationMs = %v, want a non-negative number", e.fields["durationMs"])
			}
			if _, err := json.Marshal(e.fields); err != nil {
				t.Errorf("fields must be JSON-serializable: %v", err)
			}
		})
	}
}

func TestRequestLogging_ClientErrors_AreNotLoggedAsErrors(t *testing.T) {
	t.Parallel()
	s := newStack(t, nil)

	postQR(t, s.app, `{"matrix":[]}`)
	get(t, s.app, "/missing")

	if errs := s.logger.byLevel("error"); len(errs) != 0 {
		t.Fatalf("4xx responses must not produce error logs: %+v", errs)
	}
}

func TestRequestLogging_UpstreamFailure_LogsCauseServerSide(t *testing.T) {
	t.Parallel()
	s := newStack(t, func(w nethttp.ResponseWriter, _ *nethttp.Request) { w.WriteHeader(500) })

	postQR(t, s.app, `{"matrix":[[1]]}`)

	errs := s.logger.byLevel("error")
	if len(errs) != 1 || errs[0].fields["code"] != "UPSTREAM_UNAVAILABLE" {
		t.Fatalf("expected one UPSTREAM_UNAVAILABLE error log, got %+v", errs)
	}
	if cause, _ := errs[0].fields["error"].(string); !strings.Contains(cause, "500") {
		t.Errorf("the cause belongs in the log: %q", cause)
	}
}
