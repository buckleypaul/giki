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
)

// TestHandleTree_Integration tests the /api/tree endpoint with a real repository.
func TestHandleTree_Integration(t *testing.T) {
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

	// Create test files
	files := map[string]string{
		"README.md":     "# Test",
		"docs/setup.md": "# Setup",
	}

	for path, content := range files {
		fullPath := filepath.Join(tempDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			t.Fatalf("failed to write file %s: %v", path, err)
		}
		if _, err := w.Add(path); err != nil {
			t.Fatalf("failed to add file %s: %v", path, err)
		}
	}

	if _, err := w.Commit("initial commit", &gogit.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and server
	provider, err := git.NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	server := New(4242, provider)

	// Create test request
	req := httptest.NewRequest("GET", "/api/tree", nil)
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
	var tree git.TreeNode
	if err := json.NewDecoder(rec.Body).Decode(&tree); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify tree has expected structure
	if len(tree.Children) != 2 {
		t.Errorf("expected 2 root children, got %d", len(tree.Children))
	}

	// Verify first child is docs directory
	if len(tree.Children) >= 1 {
		if !tree.Children[0].IsDir || tree.Children[0].Name != "docs" {
			t.Errorf("expected first child to be 'docs' directory, got: %+v", tree.Children[0])
		}
	}

	// Verify second child is README.md file
	if len(tree.Children) >= 2 {
		if tree.Children[1].IsDir || tree.Children[1].Name != "README.md" {
			t.Errorf("expected second child to be 'README.md' file, got: %+v", tree.Children[1])
		}
	}
}
