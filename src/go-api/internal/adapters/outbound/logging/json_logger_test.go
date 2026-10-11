package logging_test

import (
	"bytes"
	"encoding/json"
	"strings"
	"sync"
	"testing"

	"go-api/internal/adapters/outbound/logging"
	"go-api/internal/application"
)

func parseLines(t *testing.T, out string) []map[string]any {
	t.Helper()
	var entries []map[string]any
	for _, line := range strings.Split(strings.TrimSuffix(out, "\n"), "\n") {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("line %q is not valid JSON: %v", line, err)
		}
		entries = append(entries, entry)
	}
	return entries
}

func TestJSONLogger_EachLevel_WritesOneJSONLineWithCoreKeys(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	l := logging.New(&buf)

	l.Info("hello", application.Fields{"a": 1})
	l.Warn("careful", nil)
	l.Error("boom", application.Fields{"code": "X"})

	entries := parseLines(t, buf.String())
	if len(entries) != 3 {
		t.Fatalf("lines = %d, want 3", len(entries))
	}
	for i, want := range []struct{ level, message string }{{"info", "hello"}, {"warn", "careful"}, {"error", "boom"}} {
		if entries[i]["level"] != want.level || entries[i]["message"] != want.message {
			t.Errorf("entry %d = %v, want %v", i, entries[i], want)
		}
		if entries[i]["time"] == nil {
			t.Errorf("entry %d has no time", i)
		}
	}
	if entries[0]["a"] != float64(1) {
		t.Errorf("custom field missing: %v", entries[0])
	}
}

func TestJSONLogger_FieldsUsingCoreKeys_CannotOverrideThem(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	logging.New(&buf).Info("real", application.Fields{"level": "fake", "message": "fake", "time": "fake"})

	entry := parseLines(t, buf.String())[0]
	if entry["level"] != "info" || entry["message"] != "real" || entry["time"] == "fake" {
		t.Fatalf("core keys were overridden: %v", entry)
	}
}

func TestJSONLogger_UnserializableField_StillWritesAFallbackLine(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	logging.New(&buf).Info("x", application.Fields{"bad": make(chan int)})

	entry := parseLines(t, buf.String())[0]
	if entry["level"] != "error" || entry["message"] != "log encoding failed" {
		t.Fatalf("entry = %v, want the fallback line", entry)
	}
}

func TestJSONLogger_ConcurrentWrites_KeepEveryLineIntact(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	l := logging.New(&buf)

	var wg sync.WaitGroup
	for range 50 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			l.Info("concurrent", application.Fields{"payload": strings.Repeat("x", 200)})
		}()
	}
	wg.Wait()

	if got := len(parseLines(t, buf.String())); got != 50 {
		t.Fatalf("lines = %d, want 50", got)
	}
}
