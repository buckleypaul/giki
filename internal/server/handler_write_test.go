package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/buckleypaul/giki/internal/git"
)


// TestHandleWrite_WriteNewFile tests writing a new file via POST /api/write.
func TestHandleWrite_WriteNewFile(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request body
	reqBody := WriteRequest{
		Path:    "test.md",
		Content: "# Test File\n\nThis is a test.",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/api/write", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Call handler
	server.handleWrite(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Verify file exists on disk
	fullPath := filepath.Join(tempDir, "test.md")
	content, err := os.ReadFile(fullPath)
	if err != nil {
		t.Fatalf("file was not created: %v", err)
	}

	if string(content) != reqBody.Content {
		t.Errorf("expected content %q, got %q", reqBody.Content, string(content))
	}
}

// TestHandleWrite_EmptyPath tests that empty path returns error.
func TestHandleWrite_EmptyPath(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request with empty path
	reqBody := WriteRequest{
		Path:    "",
		Content: "content",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/write", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleWrite(rec, req)

	// Should return 400 Bad Request
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

// TestHandleDelete_DeleteFile tests deleting a file via POST /api/delete.
func TestHandleDelete_DeleteFile(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create a test file
	testFile := filepath.Join(tempDir, "delete-me.md")
	if err := os.WriteFile(testFile, []byte("content"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request body
	reqBody := DeleteRequest{
		Path: "delete-me.md",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/api/delete", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Call handler
	server.handleDelete(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Verify file no longer exists
	if _, err := os.Stat(testFile); !os.IsNotExist(err) {
		t.Error("file was not deleted")
	}
}

// TestHandleDelete_NonexistentFile tests deleting a nonexistent file returns error.
func TestHandleDelete_NonexistentFile(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request with nonexistent file
	reqBody := DeleteRequest{
		Path: "nonexistent.md",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/delete", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleDelete(rec, req)

	// Should return 500 Internal Server Error (file not found)
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

// TestHandleMove_MoveFile tests moving a file via POST /api/move.
func TestHandleMove_MoveFile(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create a test file
	oldFile := filepath.Join(tempDir, "old.md")
	content := []byte("file content")
	if err := os.WriteFile(oldFile, content, 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request body
	reqBody := MoveRequest{
		OldPath: "old.md",
		NewPath: "new.md",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/api/move", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Call handler
	server.handleMove(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Verify old file no longer exists
	if _, err := os.Stat(oldFile); !os.IsNotExist(err) {
		t.Error("old file was not removed")
	}

	// Verify new file exists with same content
	newFile := filepath.Join(tempDir, "new.md")
	newContent, err := os.ReadFile(newFile)
	if err != nil {
		t.Fatalf("new file was not created: %v", err)
	}

	if string(newContent) != string(content) {
		t.Errorf("expected content %q, got %q", string(content), string(newContent))
	}
}

// TestHandleMove_EmptyPaths tests that empty paths return error.
func TestHandleMove_EmptyPaths(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Test empty oldPath
	reqBody := MoveRequest{
		OldPath: "",
		NewPath: "new.md",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/move", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleMove(rec, req)

	// Should return 400 Bad Request
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}
