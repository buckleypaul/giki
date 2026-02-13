package git

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// TestNewLocalProvider_GikiRepoItself tests opening the giki repository itself.
func TestNewLocalProvider_GikiRepoItself(t *testing.T) {
	// Get the root of the giki repository (two levels up from internal/git)
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}
	repoRoot := filepath.Join(cwd, "..", "..")

	provider, err := NewLocalProvider(repoRoot, "")
	if err != nil {
		t.Fatalf("expected to open giki repo, got error: %v", err)
	}

	if provider == nil {
		t.Fatal("expected non-nil provider")
	}

	if provider.repo == nil {
		t.Fatal("expected non-nil repo")
	}

	if provider.path != repoRoot {
		t.Errorf("expected path %q, got %q", repoRoot, provider.path)
	}

	// Should have resolved to a branch name (typically "main")
	if provider.branch == "" {
		t.Error("expected branch to be resolved, got empty string")
	}
}

// TestNewLocalProvider_NonGitDirectory tests that non-git directories return expected error.
func TestNewLocalProvider_NonGitDirectory(t *testing.T) {
	tempDir := t.TempDir()

	_, err := NewLocalProvider(tempDir, "")
	if err == nil {
		t.Fatal("expected error for non-git directory, got nil")
	}

	expectedMsg := "is not a git repository"
	if !strings.Contains(err.Error(), expectedMsg) {
		t.Errorf("expected error to contain %q, got: %v", expectedMsg, err)
	}

	// Verify the path is included in the error message
	if !strings.Contains(err.Error(), tempDir) {
		t.Errorf("expected error to contain path %q, got: %v", tempDir, err)
	}
}

// TestNewLocalProvider_NonexistentBranch tests that nonexistent branches return expected error.
func TestNewLocalProvider_NonexistentBranch(t *testing.T) {
	// Create a temporary git repository
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	// Create an initial commit so HEAD points to a valid branch
	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("test.txt"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Try to open with nonexistent branch
	_, err = NewLocalProvider(tempDir, "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent branch, got nil")
	}

	expectedMsg := "branch 'nonexistent' not found"
	if err.Error() != expectedMsg {
		t.Errorf("expected error %q, got: %v", expectedMsg, err)
	}
}

// TestNewLocalProvider_HEADBranchResolves tests that HEAD branch resolves correctly.
func TestNewLocalProvider_HEADBranchResolves(t *testing.T) {
	// Create a temporary git repository
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	// Create an initial commit so HEAD points to a valid branch
	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("test.txt"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Open without specifying branch (should resolve to current branch)
	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("expected to open repo, got error: %v", err)
	}

	// Default branch for git init is "master" or "main" depending on git config
	// Just verify it's not empty
	if provider.branch == "" {
		t.Error("expected branch to be resolved, got empty string")
	}
}

// TestNewLocalProvider_ExplicitBranch tests opening with an explicit valid branch.
func TestNewLocalProvider_ExplicitBranch(t *testing.T) {
	// Create a temporary git repository with multiple branches
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	// Create initial commit on main branch
	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := w.Add("test.txt"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	commit, err := w.Commit("initial commit", &git.CommitOptions{})
	if err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create a new branch "dev"
	headRef, err := repo.Head()
	if err != nil {
		t.Fatalf("failed to get HEAD: %v", err)
	}
	devBranch := plumbing.NewBranchReferenceName("dev")
	devRef := plumbing.NewHashReference(devBranch, commit)
	if err := repo.Storer.SetReference(devRef); err != nil {
		t.Fatalf("failed to create dev branch: %v", err)
	}

	// Open with explicit branch "dev"
	provider, err := NewLocalProvider(tempDir, "dev")
	if err != nil {
		t.Fatalf("expected to open repo with dev branch, got error: %v", err)
	}

	if provider.branch != "dev" {
		t.Errorf("expected branch 'dev', got %q", provider.branch)
	}

	// Verify HEAD branch still works
	currentBranch := headRef.Name().Short()
	provider2, err := NewLocalProvider(tempDir, currentBranch)
	if err != nil {
		t.Fatalf("expected to open repo with current branch, got error: %v", err)
	}

	if provider2.branch != currentBranch {
		t.Errorf("expected branch %q, got %q", currentBranch, provider2.branch)
	}
}
