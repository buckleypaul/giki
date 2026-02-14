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

// TestHandleSearch_Filename tests the /api/search endpoint with type=filename.
func TestHandleSearch_Filename(t *testing.T) {
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
		"README.md":        "# Test",
		"docs/setup.md":    "# Setup",
		"src/setup.go":     "package main",
		"src/server.go":    "package main",
		"tests/setup_test.go": "package tests",
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

	// Test filename search for "setup"
	req := httptest.NewRequest("GET", "/api/search?q=setup&type=filename", nil)
	w2 := httptest.NewRecorder()

	server.handleSearch(w2, req)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var results []string
	if err := json.NewDecoder(w2.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should find files containing "setup"
	if len(results) == 0 {
		t.Fatalf("expected at least one result, got none")
	}

	// Check that results contain setup-related files
	foundSetupMd := false
	foundSetupGo := false
	for _, path := range results {
		if path == "docs/setup.md" {
			foundSetupMd = true
		}
		if path == "src/setup.go" {
			foundSetupGo = true
		}
	}

	if !foundSetupMd || !foundSetupGo {
		t.Errorf("expected to find setup.md and setup.go, got: %v", results)
	}
}

// TestHandleSearch_Content tests the /api/search endpoint with type=content.
func TestHandleSearch_Content(t *testing.T) {
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

	// Create test files with searchable content
	files := map[string]string{
		"README.md": `# Installation Guide

To install this package, run:

npm install giki

After installation, you can use it.`,
		"docs/usage.md": `# Usage

First, install the dependencies.

Then run the server.`,
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

	// Test content search for "install"
	req := httptest.NewRequest("GET", "/api/search?q=install&type=content", nil)
	w2 := httptest.NewRecorder()

	server.handleSearch(w2, req)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var results []git.SearchResult
	if err := json.NewDecoder(w2.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should find matches in both files
	if len(results) == 0 {
		t.Fatalf("expected at least one result, got none")
	}

	// Check that results have required fields
	for _, result := range results {
		if result.Path == "" {
			t.Errorf("result missing path")
		}
		if result.LineNumber == 0 {
			t.Errorf("result missing line number")
		}
		if len(result.Context) == 0 {
			t.Errorf("result missing context")
		}
		if result.MatchText == "" {
			t.Errorf("result missing match text")
		}
	}

	// Verify one of the results
	foundReadme := false
	for _, result := range results {
		if result.Path == "README.md" {
			foundReadme = true
			// Match text should preserve original case from file
			if result.MatchText != "Installation" && result.MatchText != "install" {
				// Both are valid - "Installation" from line 1 or "install" from line 5
				t.Logf("match text: %q", result.MatchText)
			}
		}
	}

	if !foundReadme {
		t.Errorf("expected to find match in README.md")
	}
}

// TestHandleSearch_InvalidType tests the /api/search endpoint with an invalid type parameter.
func TestHandleSearch_InvalidType(t *testing.T) {
	// Create a temporary git repository
	tempDir := t.TempDir()
	repo, err := gogit.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	// Create initial commit so HEAD exists
	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	fullPath := filepath.Join(tempDir, ".gitkeep")
	if err := os.WriteFile(fullPath, []byte(""), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}
	if _, err := w.Add(".gitkeep"); err != nil {
		t.Fatalf("failed to add file: %v", err)
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

	// Test with invalid type
	req := httptest.NewRequest("GET", "/api/search?q=test&type=invalid", nil)
	rec := httptest.NewRecorder()

	server.handleSearch(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}
}

// TestHandleSearch_EmptyQuery tests the /api/search endpoint with an empty query.
func TestHandleSearch_EmptyQuery(t *testing.T) {
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

	// Create a test file
	fullPath := filepath.Join(tempDir, "README.md")
	if err := os.WriteFile(fullPath, []byte("# Test"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}
	if _, err := w.Add("README.md"); err != nil {
		t.Fatalf("failed to add file: %v", err)
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

	// Test with empty query
	req := httptest.NewRequest("GET", "/api/search?q=&type=filename", nil)
	w2 := httptest.NewRecorder()

	server.handleSearch(w2, req)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w2.Code)
	}

	var results []string
	if err := json.NewDecoder(w2.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should return empty array
	if len(results) != 0 {
		t.Errorf("expected empty results for empty query, got %d results", len(results))
	}
}
