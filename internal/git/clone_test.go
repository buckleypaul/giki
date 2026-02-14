package git

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

func TestParseGitURL(t *testing.T) {
	tests := []struct {
		name        string
		url         string
		wantOwner   string
		wantRepo    string
		wantErr     bool
		errContains string
	}{
		{
			name:      "HTTPS with .git suffix",
			url:       "https://github.com/torvalds/linux.git",
			wantOwner: "torvalds",
			wantRepo:  "linux",
			wantErr:   false,
		},
		{
			name:      "HTTPS without .git suffix",
			url:       "https://github.com/golang/go",
			wantOwner: "golang",
			wantRepo:  "go",
			wantErr:   false,
		},
		{
			name:      "HTTP with .git suffix",
			url:       "http://github.com/user/repo.git",
			wantOwner: "user",
			wantRepo:  "repo",
			wantErr:   false,
		},
		{
			name:      "HTTP without .git suffix",
			url:       "http://gitlab.com/user/project",
			wantOwner: "user",
			wantRepo:  "project",
			wantErr:   false,
		},
		{
			name:      "SSH git@ format with .git",
			url:       "git@github.com:owner/repository.git",
			wantOwner: "owner",
			wantRepo:  "repository",
			wantErr:   false,
		},
		{
			name:      "SSH git@ format without .git",
			url:       "git@github.com:owner/repository",
			wantOwner: "owner",
			wantRepo:  "repository",
			wantErr:   false,
		},
		{
			name:      "SSH protocol format",
			url:       "ssh://git@github.com/owner/repo.git",
			wantOwner: "owner",
			wantRepo:  "repo",
			wantErr:   false,
		},
		{
			name:      "GitLab HTTPS",
			url:       "https://gitlab.com/gitlab-org/gitlab",
			wantOwner: "gitlab-org",
			wantRepo:  "gitlab",
			wantErr:   false,
		},
		{
			name:      "Nested path (uses last two segments)",
			url:       "https://github.com/a/b/owner/repo.git",
			wantOwner: "owner",
			wantRepo:  "repo",
			wantErr:   false,
		},
		{
			name:        "Invalid: no owner/repo",
			url:         "https://github.com/",
			wantErr:     true,
			errContains: "invalid",
		},
		{
			name:        "Invalid: only owner",
			url:         "https://github.com/owner",
			wantErr:     true,
			errContains: "invalid",
		},
		{
			name:        "Invalid: SSH without colon",
			url:         "git@github.com/owner/repo",
			wantErr:     true,
			errContains: "invalid SSH URL format",
		},
		{
			name:        "Invalid: unsupported protocol",
			url:         "ftp://github.com/owner/repo",
			wantErr:     true,
			errContains: "unsupported URL format",
		},
		{
			name:        "Invalid: empty string",
			url:         "",
			wantErr:     true,
			errContains: "unsupported URL format",
		},
		{
			name:      "URL with trailing whitespace",
			url:       "  https://github.com/owner/repo.git  ",
			wantOwner: "owner",
			wantRepo:  "repo",
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			owner, repo, err := parseGitURL(tt.url)

			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.errContains)
				}
				if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("error %q does not contain %q", err.Error(), tt.errContains)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if owner != tt.wantOwner {
				t.Errorf("owner = %q, want %q", owner, tt.wantOwner)
			}
			if repo != tt.wantRepo {
				t.Errorf("repo = %q, want %q", repo, tt.wantRepo)
			}
		})
	}
}

func TestGetClonePath_PathCreation(t *testing.T) {
	// Test that the path is constructed correctly
	owner := "testowner"
	repo := "testrepo"
	url := "https://github.com/" + owner + "/" + repo + ".git"

	homeDir, err := os.UserHomeDir()
	if err != nil {
		t.Fatalf("failed to get home dir: %v", err)
	}

	expectedPath := filepath.Join(homeDir, ".giki", "repos", owner, repo)

	actualPath, exists, err := GetClonePath(url)
	if err != nil {
		t.Fatalf("GetClonePath failed: %v", err)
	}

	if actualPath != expectedPath {
		t.Errorf("path = %q, want %q", actualPath, expectedPath)
	}

	// For a new clone, exists should be false (unless someone actually has this path)
	// We can't reliably test exists=true without creating a real repo
	_ = exists
}

func TestGetClonePath_DetectsExisting(t *testing.T) {
	// This test verifies the logic but doesn't actually test GetClonePath with a real path
	// since that would require modifying ~/.giki/repos
	// Instead we verify the .git detection logic works
	tempDir := t.TempDir()

	// Initialize a git repo
	_, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init git repo: %v", err)
	}

	// Check if .git directory exists (simulating the check in GetClonePath)
	gitDir := filepath.Join(tempDir, ".git")
	if _, err := os.Stat(gitDir); err != nil {
		t.Fatalf(".git directory should exist but stat failed: %v", err)
	}

	// Verify our check would detect it exists
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		t.Error("expected repo to exist, but stat says it doesn't")
	}
}

func TestPullExisting(t *testing.T) {
	// Create a temporary git repository
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init repo: %v", err)
	}

	// Create a commit so the repo is valid
	worktree, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	testFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if _, err := worktree.Add("test.txt"); err != nil {
		t.Fatalf("failed to add file: %v", err)
	}

	if _, err := worktree.Commit("initial commit", &git.CommitOptions{
		Author: &object.Signature{
			Name:  "Test",
			Email: "test@example.com",
		},
	}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Test pulling a repo with no remote configured
	err = PullExisting(tempDir)
	if err == nil {
		t.Error("expected error when pulling repo with no remote, got nil")
	}
	// Should get "no upstream branch configured" error or similar
}

func TestPullExisting_InvalidPath(t *testing.T) {
	err := PullExisting("/nonexistent/path")
	if err == nil {
		t.Error("expected error for nonexistent path, got nil")
	}
	if !contains(err.Error(), "failed to open repository") {
		t.Errorf("expected 'failed to open repository' error, got: %v", err)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || stringContains(s, substr))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
