package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func newThemesTestServer(themesDir string) *Server {
	return &Server{
		mux:       http.NewServeMux(),
		port:      4242,
		themesDir: themesDir,
	}
}

func TestHandleThemes_MissingDir(t *testing.T) {
	s := newThemesTestServer(filepath.Join(t.TempDir(), "nonexistent"))

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 0 {
		t.Errorf("expected empty array, got %d themes", len(themes))
	}
}

func TestHandleThemes_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 0 {
		t.Errorf("expected empty array, got %d themes", len(themes))
	}
}

func TestHandleThemes_ValidTheme(t *testing.T) {
	dir := t.TempDir()

	themeJSON := `{
		"id": "my-theme",
		"name": "My Theme",
		"author": "Test Author",
		"type": "dark",
		"highlightTheme": "github-dark",
		"colors": {
			"bg-primary": "#1e1e2e",
			"text-primary": "#cdd6f4"
		}
	}`

	if err := os.WriteFile(filepath.Join(dir, "my-theme.json"), []byte(themeJSON), 0644); err != nil {
		t.Fatalf("failed to write theme file: %v", err)
	}

	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 1 {
		t.Fatalf("expected 1 theme, got %d", len(themes))
	}

	if themes[0].ID != "my-theme" {
		t.Errorf("expected id 'my-theme', got %q", themes[0].ID)
	}
	if themes[0].Name != "My Theme" {
		t.Errorf("expected name 'My Theme', got %q", themes[0].Name)
	}
	if themes[0].Type != "dark" {
		t.Errorf("expected type 'dark', got %q", themes[0].Type)
	}
	if themes[0].Colors["bg-primary"] != "#1e1e2e" {
		t.Errorf("expected bg-primary '#1e1e2e', got %q", themes[0].Colors["bg-primary"])
	}
}

func TestHandleThemes_InvalidJSON(t *testing.T) {
	dir := t.TempDir()

	if err := os.WriteFile(filepath.Join(dir, "bad.json"), []byte("not json"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 0 {
		t.Errorf("expected invalid JSON to be skipped, got %d themes", len(themes))
	}
}

func TestHandleThemes_MissingFields(t *testing.T) {
	dir := t.TempDir()

	// Missing name
	noName := `{"type": "dark", "colors": {"bg": "#000"}}`
	if err := os.WriteFile(filepath.Join(dir, "no-name.json"), []byte(noName), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Missing type
	noType := `{"name": "Test", "colors": {"bg": "#000"}}`
	if err := os.WriteFile(filepath.Join(dir, "no-type.json"), []byte(noType), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Empty colors
	noColors := `{"name": "Test", "type": "dark", "colors": {}}`
	if err := os.WriteFile(filepath.Join(dir, "no-colors.json"), []byte(noColors), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 0 {
		t.Errorf("expected all invalid themes to be skipped, got %d themes", len(themes))
	}
}

func TestHandleThemes_FilenameAsID(t *testing.T) {
	dir := t.TempDir()

	// Theme without an id field — should use filename
	themeJSON := `{
		"name": "Custom Theme",
		"type": "light",
		"colors": {"bg-primary": "#fff"}
	}`

	if err := os.WriteFile(filepath.Join(dir, "custom-theme.json"), []byte(themeJSON), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 1 {
		t.Fatalf("expected 1 theme, got %d", len(themes))
	}

	if themes[0].ID != "custom-theme" {
		t.Errorf("expected id 'custom-theme' from filename, got %q", themes[0].ID)
	}
}

func TestHandleThemes_NonJSONSkipped(t *testing.T) {
	dir := t.TempDir()

	// Non-JSON files should be skipped
	if err := os.WriteFile(filepath.Join(dir, "readme.txt"), []byte("not a theme"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Valid theme
	themeJSON := `{"name": "Valid", "type": "dark", "colors": {"bg": "#000"}}`
	if err := os.WriteFile(filepath.Join(dir, "valid.json"), []byte(themeJSON), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	s := newThemesTestServer(dir)

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	var themes []UserTheme
	if err := json.NewDecoder(rec.Body).Decode(&themes); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(themes) != 1 {
		t.Errorf("expected 1 theme (non-JSON skipped), got %d", len(themes))
	}
}

func TestHandleThemes_ContentType(t *testing.T) {
	s := newThemesTestServer(t.TempDir())

	req := httptest.NewRequest("GET", "/api/themes", nil)
	rec := httptest.NewRecorder()

	s.handleThemes(rec, req)

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got %q", ct)
	}
}
