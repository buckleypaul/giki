package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/buckleypaul/giki/internal/git"
	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// testSignature returns a test git signature for commits.
func testSignature() *object.Signature {
	return &object.Signature{
		Name:  "Test User",
		Email: "test@example.com",
	}
}

// TestHandleStatus_CleanRepository tests that /api/status returns isDirty: false for a clean repository.
func TestHandleStatus_CleanRepository(t *testing.T) {
	// Create a temp directory
	tempDir := t.TempDir()

	// Initialize a git repository
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init repo: %v", err)
	}

	// Create and commit a file
	testFile := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(testFile, []byte("# Test"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	if _, err := worktree.Add("README.md"); err != nil {
		t.Fatalf("failed to stage file: %v", err)
	}

	if _, err := worktree.Commit("Initial commit", &gogit.CommitOptions{
		Author: testSignature(),
	}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec := httptest.NewRecorder()

	// Call handler
	server.handleStatus(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Check Content-Type
	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got %q", contentType)
	}

	// Parse response
	var status git.RepoStatus
	if err := json.NewDecoder(rec.Body).Decode(&status); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify response fields
	if status.Source != tempDir {
		t.Errorf("expected source %q, got %q", tempDir, status.Source)
	}

	if status.Branch != "master" {
		t.Errorf("expected branch 'master', got %q", status.Branch)
	}

	if status.IsDirty {
		t.Error("expected clean repository (isDirty: false), got isDirty: true")
	}
}

// TestHandleStatus_DirtyRepository tests that /api/status returns isDirty: true for a dirty repository.
func TestHandleStatus_DirtyRepository(t *testing.T) {
	// Create a temp directory
	tempDir := t.TempDir()

	// Initialize a git repository
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init repo: %v", err)
	}

	// Create and commit a file
	testFile := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(testFile, []byte("# Test"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	if _, err := worktree.Add("README.md"); err != nil {
		t.Fatalf("failed to stage file: %v", err)
	}

	if _, err := worktree.Commit("Initial commit", &gogit.CommitOptions{
		Author: testSignature(),
	}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Modify file to make repository dirty
	if err := os.WriteFile(testFile, []byte("# Test - Modified"), 0644); err != nil {
		t.Fatalf("failed to modify file: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec := httptest.NewRecorder()

	// Call handler
	server.handleStatus(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Parse response
	var status git.RepoStatus
	if err := json.NewDecoder(rec.Body).Decode(&status); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify isDirty is true
	if !status.IsDirty {
		t.Error("expected dirty repository (isDirty: true), got isDirty: false")
	}

	if status.Source != tempDir {
		t.Errorf("expected source %q, got %q", tempDir, status.Source)
	}

	if status.Branch != "master" {
		t.Errorf("expected branch 'master', got %q", status.Branch)
	}
}

// TestHandleStatus_JSON tests that /api/status returns valid JSON.
func TestHandleStatus_JSON(t *testing.T) {
	// Create a temp directory
	tempDir := t.TempDir()

	// Initialize a git repository
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init repo: %v", err)
	}

	// Create and commit a file
	testFile := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(testFile, []byte("# Test"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	if _, err := worktree.Add("README.md"); err != nil {
		t.Fatalf("failed to stage file: %v", err)
	}

	if _, err := worktree.Commit("Initial commit", &gogit.CommitOptions{
		Author: testSignature(),
	}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec := httptest.NewRecorder()

	// Call handler
	server.handleStatus(rec, req)

	// Verify JSON structure
	var result map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode JSON: %v", err)
	}

	// Verify expected fields exist
	expectedFields := []string{"source", "branch", "isDirty"}
	for _, field := range expectedFields {
		if _, exists := result[field]; !exists {
			t.Errorf("expected field %q in JSON response", field)
		}
	}
}
