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
	"github.com/go-git/go-git/v5/plumbing"
)

// TestHandleBranches_Integration tests the /api/branches endpoint with a real repository.
func TestHandleBranches_Integration(t *testing.T) {
	// Create a temporary git repository
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
	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("test.txt"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	commit, err := w.Commit("initial commit", testCommitOptions())
	if err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Get current branch name
	headRef, err := repo.Head()
	if err != nil {
		t.Fatalf("failed to get HEAD: %v", err)
	}
	currentBranch := headRef.Name().Short()

	// Create additional branches
	devRef := plumbing.NewHashReference(plumbing.NewBranchReferenceName("dev"), commit)
	if err := repo.Storer.SetReference(devRef); err != nil {
		t.Fatalf("failed to create dev branch: %v", err)
	}

	featureRef := plumbing.NewHashReference(plumbing.NewBranchReferenceName("feature"), commit)
	if err := repo.Storer.SetReference(featureRef); err != nil {
		t.Fatalf("failed to create feature branch: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest("GET", "/api/branches", nil)
	rec := httptest.NewRecorder()

	// Call handler
	server.mux.ServeHTTP(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Check content type
	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}

	// Parse response
	var branches []git.BranchInfo
	if err := json.NewDecoder(rec.Body).Decode(&branches); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should have 3 branches
	if len(branches) != 3 {
		t.Fatalf("expected 3 branches, got %d", len(branches))
	}

	// Build a map for easier verification
	branchMap := make(map[string]git.BranchInfo)
	for _, b := range branches {
		branchMap[b.Name] = b
	}

	// Verify all branches exist
	if _, ok := branchMap[currentBranch]; !ok {
		t.Errorf("expected branch %q to be in list", currentBranch)
	}
	if _, ok := branchMap["dev"]; !ok {
		t.Error("expected branch 'dev' to be in list")
	}
	if _, ok := branchMap["feature"]; !ok {
		t.Error("expected branch 'feature' to be in list")
	}

	// Verify only current branch is marked as default
	defaultCount := 0
	for _, b := range branches {
		if b.IsDefault {
			defaultCount++
			if b.Name != currentBranch {
				t.Errorf("expected default branch to be %q, got %q", currentBranch, b.Name)
			}
		}
	}

	if defaultCount != 1 {
		t.Errorf("expected exactly 1 default branch, got %d", defaultCount)
	}
}

// TestHandleBranches_SingleBranch tests the endpoint with a single-branch repository.
func TestHandleBranches_SingleBranch(t *testing.T) {
	// Create a temporary git repository
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
	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("test.txt"); err != nil {
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
	req := httptest.NewRequest("GET", "/api/branches", nil)
	rec := httptest.NewRecorder()

	// Call handler
	server.mux.ServeHTTP(rec, req)

	// Check status code
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Parse response
	var branches []git.BranchInfo
	if err := json.NewDecoder(rec.Body).Decode(&branches); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should have exactly 1 branch
	if len(branches) != 1 {
		t.Fatalf("expected 1 branch, got %d", len(branches))
	}

	// That branch should be marked as default
	if !branches[0].IsDefault {
		t.Error("expected single branch to be marked as default")
	}

	// Branch name should be non-empty
	if branches[0].Name == "" {
		t.Error("expected branch name to be non-empty")
	}
}
