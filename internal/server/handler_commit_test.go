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
	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)


// createTestRepoWithCommit creates a git repository with an initial commit so HEAD exists.
func createTestRepoWithCommit(t *testing.T, tempDir string) *gogit.Repository {
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init repo: %v", err)
	}
	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}
	dummyFile := filepath.Join(tempDir, ".gitkeep")
	if err := os.WriteFile(dummyFile, []byte(""), 0644); err != nil {
		t.Fatalf("failed to write dummy file: %v", err)
	}
	if _, err := w.Add(".gitkeep"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}
	if _, err := w.Commit("Initial commit", &gogit.CommitOptions{
		Author: testSignature(),
	}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}
	return repo
}

// TestHandleCommit_CreateCommit tests creating a commit via POST /api/commit.
func TestHandleCommit_CreateCommit(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	repo := createTestRepoWithCommit(t, tempDir)

	// Create provider
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// Write a file (using provider to ensure it's on disk)
	if err := provider.WriteFile("test.md", []byte("test content")); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Create server
	server := New(4242, provider)

	// Create request body
	reqBody := CommitRequest{
		Message: "Add test.md file",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Create test request
	req := httptest.NewRequest(http.MethodPost, "/api/commit", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Call handler
	server.handleCommit(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Parse response to get commit hash
	var resp CommitResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify hash is not empty
	if resp.Hash == "" {
		t.Error("expected non-empty commit hash")
	}

	// Verify commit exists in repository
	commitObj, err := repo.CommitObject(plumbing.NewHash(resp.Hash))
	if err != nil {
		t.Fatalf("commit not found in repository: %v", err)
	}

	// Verify commit message
	if commitObj.Message != reqBody.Message {
		t.Errorf("expected commit message %q, got %q", reqBody.Message, commitObj.Message)
	}
}

// TestHandleCommit_StatusCleanAfterCommit tests that repository is clean after commit.
func TestHandleCommit_StatusCleanAfterCommit(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// Write a file
	if err := provider.WriteFile("test.md", []byte("content")); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// Verify repository is dirty before commit
	statusBefore, err := provider.Status()
	if err != nil {
		t.Fatalf("failed to get status: %v", err)
	}
	if !statusBefore.IsDirty {
		t.Error("expected dirty repository before commit")
	}

	// Create server
	server := New(4242, provider)

	// Create commit
	reqBody := CommitRequest{
		Message: "Test commit",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/commit", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleCommit(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("commit failed: %s", rec.Body.String())
	}

	// Verify repository is clean after commit
	statusAfter, err := provider.Status()
	if err != nil {
		t.Fatalf("failed to get status after commit: %v", err)
	}
	if statusAfter.IsDirty {
		t.Error("expected clean repository after commit")
	}
}

// TestHandleCommit_EmptyMessage tests that empty commit message returns error.
func TestHandleCommit_EmptyMessage(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Create request with empty message
	reqBody := CommitRequest{
		Message: "",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/commit", bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handleCommit(rec, req)

	// Should return 400 Bad Request
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}

	// Verify error message
	var errResp ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}

	if errResp.Error == "" {
		t.Error("expected error message in response")
	}
}

// TestHandleCommit_IntegrationFlow tests the full write -> commit -> status flow.
func TestHandleCommit_IntegrationFlow(t *testing.T) {
	// Create temp directory and git repo
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	server := New(4242, provider)

	// Step 1: Write a file via POST /api/write
	writeReq := WriteRequest{
		Path:    "test.md",
		Content: "# Test File",
	}
	writeJSON, _ := json.Marshal(writeReq)
	req1 := httptest.NewRequest(http.MethodPost, "/api/write", bytes.NewReader(writeJSON))
	req1.Header.Set("Content-Type", "application/json")
	rec1 := httptest.NewRecorder()
	server.handleWrite(rec1, req1)

	if rec1.Code != http.StatusOK {
		t.Fatalf("write failed: %s", rec1.Body.String())
	}

	// Verify file exists
	fullPath := filepath.Join(tempDir, "test.md")
	if _, err := os.Stat(fullPath); err != nil {
		t.Fatalf("file not created: %v", err)
	}

	// Step 2: Create commit via POST /api/commit
	commitReq := CommitRequest{
		Message: "Add test file",
	}
	commitJSON, _ := json.Marshal(commitReq)
	req2 := httptest.NewRequest(http.MethodPost, "/api/commit", bytes.NewReader(commitJSON))
	req2.Header.Set("Content-Type", "application/json")
	rec2 := httptest.NewRecorder()
	server.handleCommit(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("commit failed: %s", rec2.Body.String())
	}

	// Step 3: Check status via GET /api/status (should be clean)
	req3 := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec3 := httptest.NewRecorder()
	server.handleStatus(rec3, req3)

	if rec3.Code != http.StatusOK {
		t.Fatalf("status failed: %s", rec3.Body.String())
	}

	var status git.RepoStatus
	if err := json.NewDecoder(rec3.Body).Decode(&status); err != nil {
		t.Fatalf("failed to decode status: %v", err)
	}

	if status.IsDirty {
		t.Error("expected clean repository after commit, got isDirty: true")
	}
}
