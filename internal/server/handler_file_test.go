package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/buckleypaul/giki/internal/git"
	gogit "github.com/go-git/go-git/v5"
)

// TestHandleFile_MarkdownFile tests fetching a markdown file.
func TestHandleFile_MarkdownFile(t *testing.T) {
	// Create temporary git repository
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create README.md
	readmeContent := "# Test README\n\nThis is a test."
	readmePath := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(readmePath, []byte(readmeContent), 0644); err != nil {
		t.Fatalf("failed to write README: %v", err)
	}

	if _, err := w.Add("README.md"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest("GET", "/api/file/README.md", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Check response
	if w2.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w2.Code)
	}

	contentType := w2.Header().Get("Content-Type")
	if !strings.Contains(contentType, "text/markdown") && !strings.Contains(contentType, "text/plain") {
		t.Errorf("expected markdown or plain text content-type, got %q", contentType)
	}

	body := w2.Body.String()
	if body != readmeContent {
		t.Errorf("expected body %q, got %q", readmeContent, body)
	}
}

// TestHandleFile_NonexistentFile tests that nonexistent files return 404.
func TestHandleFile_NonexistentFile(t *testing.T) {
	// Create temporary git repository
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create initial commit
	readmePath := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(readmePath, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write README: %v", err)
	}

	if _, err := w.Add("README.md"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request for nonexistent file
	req := httptest.NewRequest("GET", "/api/file/nonexistent.md", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Check response
	if w2.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w2.Code)
	}

	contentType := w2.Header().Get("Content-Type")
	if !strings.Contains(contentType, "application/json") {
		t.Errorf("expected JSON content-type, got %q", contentType)
	}

	// Parse error response
	var errResp map[string]string
	if err := json.Unmarshal(w2.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}

	if _, exists := errResp["error"]; !exists {
		t.Error("expected 'error' field in JSON response")
	}
}

// TestHandleFile_GoFile tests fetching a Go source file.
func TestHandleFile_GoFile(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create main.go
	goContent := "package main\n\nfunc main() {\n\tprintln(\"hello\")\n}\n"
	goPath := filepath.Join(tempDir, "main.go")
	if err := os.WriteFile(goPath, []byte(goContent), 0644); err != nil {
		t.Fatalf("failed to write main.go: %v", err)
	}

	if _, err := w.Add("main.go"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest("GET", "/api/file/main.go", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Check response
	if w2.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w2.Code)
	}

	contentType := w2.Header().Get("Content-Type")
	if !strings.Contains(contentType, "text") {
		t.Errorf("expected text content-type for .go file, got %q", contentType)
	}

	body := w2.Body.String()
	if body != goContent {
		t.Errorf("expected body %q, got %q", goContent, body)
	}
}

// TestHandleFile_ImageFile tests fetching an image file (binary).
func TestHandleFile_ImageFile(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create a minimal PNG (1x1 transparent pixel)
	// PNG signature + IHDR + IDAT + IEND chunks
	pngData := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
		0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
		0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
		0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // IEND chunk
		0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
		0x42, 0x60, 0x82,
	}

	imgPath := filepath.Join(tempDir, "test.png")
	if err := os.WriteFile(imgPath, pngData, 0644); err != nil {
		t.Fatalf("failed to write test.png: %v", err)
	}

	if _, err := w.Add("test.png"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest("GET", "/api/file/test.png", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Check response
	if w2.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w2.Code)
	}

	contentType := w2.Header().Get("Content-Type")
	if !strings.Contains(contentType, "image/png") {
		t.Errorf("expected image/png content-type, got %q", contentType)
	}

	body, err := io.ReadAll(w2.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	if len(body) != len(pngData) {
		t.Errorf("expected body length %d, got %d", len(pngData), len(body))
	}
}

// TestHandleFile_NestedPath tests fetching a file in nested directories.
func TestHandleFile_NestedPath(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create nested file
	nestedContent := "package utils"
	nestedPath := filepath.Join(tempDir, "src", "utils", "helper.go")
	if err := os.MkdirAll(filepath.Dir(nestedPath), 0755); err != nil {
		t.Fatalf("failed to create directory: %v", err)
	}
	if err := os.WriteFile(nestedPath, []byte(nestedContent), 0644); err != nil {
		t.Fatalf("failed to write helper.go: %v", err)
	}

	if _, err := w.Add("src/utils/helper.go"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request with nested path
	req := httptest.NewRequest("GET", "/api/file/src/utils/helper.go", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Check response
	if w2.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w2.Code)
	}

	body := w2.Body.String()
	if body != nestedContent {
		t.Errorf("expected body %q, got %q", nestedContent, body)
	}
}

// TestHandleFile_DirectoryRequest tests that requesting a directory returns 404.
func TestHandleFile_DirectoryRequest(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create directory with a file
	docsDir := filepath.Join(tempDir, "docs")
	if err := os.MkdirAll(docsDir, 0755); err != nil {
		t.Fatalf("failed to create directory: %v", err)
	}

	filePath := filepath.Join(docsDir, "test.md")
	if err := os.WriteFile(filePath, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("docs/test.md"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", testCommitOptions()); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Try to request directory
	req := httptest.NewRequest("GET", "/api/file/docs", nil)
	w2 := httptest.NewRecorder()

	// Handle request
	server.mux.ServeHTTP(w2, req)

	// Should return 404 since we're requesting a directory
	if w2.Code != http.StatusNotFound {
		t.Errorf("expected status 404 for directory request, got %d", w2.Code)
	}
}
