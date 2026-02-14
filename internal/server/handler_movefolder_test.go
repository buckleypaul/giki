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

func TestHandleMoveFolder(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create directory structure
	dir1 := filepath.Join(tempDir, "dir1")
	dir2 := filepath.Join(tempDir, "dir2")
	if err := os.MkdirAll(dir1, 0755); err != nil {
		t.Fatalf("failed to create dir1: %v", err)
	}
	if err := os.MkdirAll(dir2, 0755); err != nil {
		t.Fatalf("failed to create dir2: %v", err)
	}

	// Create file in dir1
	file1 := filepath.Join(dir1, "file.txt")
	if err := os.WriteFile(file1, []byte("content"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request body
	reqBody := MoveFolderRequest{
		OldPath: "dir1",
		NewPath: "dir2/dir1",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Call handler
	server.handleMoveFolder(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify new path exists
	newPath := filepath.Join(tempDir, "dir2", "dir1")
	if _, err := os.Stat(newPath); err != nil {
		t.Errorf("dir2/dir1 not found: %v", err)
	}

	// Verify file moved
	movedFile := filepath.Join(newPath, "file.txt")
	content, err := os.ReadFile(movedFile)
	if err != nil {
		t.Errorf("file not moved: %v", err)
	}
	if string(content) != "content" {
		t.Errorf("expected content %q, got %q", "content", string(content))
	}

	// Verify old path deleted
	if _, err := os.Stat(dir1); !os.IsNotExist(err) {
		t.Error("old dir1 should be deleted")
	}
}

func TestHandleMoveFolder_InvalidRequest(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create test request with invalid JSON
	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleMoveFolder(rec, req)

	// Should return 400 Bad Request
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}

func TestHandleMoveFolder_EmptyPaths(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request with empty oldPath
	reqBody := MoveFolderRequest{
		OldPath: "",
		NewPath: "dir2",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleMoveFolder(rec, req)

	// Should return 400 Bad Request
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}
}
