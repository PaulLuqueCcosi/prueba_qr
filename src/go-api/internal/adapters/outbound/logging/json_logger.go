package logging

import (
	"encoding/json"
	"io"
	"sync"
	"time"

	"go-api/internal/application"
)

type JSONLogger struct {
	mu  sync.Mutex
	out io.Writer
}

var _ application.Logger = (*JSONLogger)(nil)

func New(out io.Writer) *JSONLogger { return &JSONLogger{out: out} }

func (l *JSONLogger) Info(message string, fields application.Fields) {
	l.write("info", message, fields)
}
func (l *JSONLogger) Warn(message string, fields application.Fields) {
	l.write("warn", message, fields)
}
func (l *JSONLogger) Error(message string, fields application.Fields) {
	l.write("error", message, fields)
}

func (l *JSONLogger) write(level, message string, fields application.Fields) {
	entry := make(map[string]any, len(fields)+3)
	for k, v := range fields {
		entry[k] = v
	}
	// Set last so callers cannot overwrite the core keys.
	entry["time"] = time.Now().UTC().Format(time.RFC3339Nano)
	entry["level"] = level
	entry["message"] = message

	line, err := json.Marshal(entry)
	if err != nil {
		line, _ = json.Marshal(map[string]any{"time": entry["time"], "level": "error", "message": "log encoding failed"})
	}
	// One mutex-guarded write keeps each JSON line intact under concurrency.
	l.mu.Lock()
	defer l.mu.Unlock()
	_, _ = l.out.Write(append(line, '\n'))
}
