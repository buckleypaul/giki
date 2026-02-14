package git

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

// GetClonePath returns the path where a remote URL would be cloned,
// and whether a repository already exists at that path.
func GetClonePath(url string) (path string, exists bool, err error) {
	owner, repo, err := parseGitURL(url)
	if err != nil {
		return "", false, fmt.Errorf("failed to parse git URL: %w", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", false, fmt.Errorf("failed to get user home directory: %w", err)
	}

	targetPath := filepath.Join(homeDir, ".giki", "repos", owner, repo)

	// Check if the repository already exists
	if _, err := os.Stat(filepath.Join(targetPath, ".git")); err == nil {
		return targetPath, true, nil
	}

	return targetPath, false, nil
}

// CloneRemote clones a remote git repository to the specified path without authentication.
// Use GetClonePath first to determine the path and check if it already exists.
// For private repositories, use CloneRemoteWithAuth instead.
func CloneRemote(url, targetPath string) error {
	return CloneRemoteWithAuth(url, targetPath, "")
}

// CloneRemoteWithAuth clones a remote git repository with optional authentication.
// If token is empty, no authentication is used (for public repos).
// Use GetClonePath first to determine the path and check if it already exists.
func CloneRemoteWithAuth(url, targetPath, token string) error {
	// Create parent directories
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories: %w", err)
	}

	// Prepare clone options
	cloneOpts := &git.CloneOptions{
		URL:      url,
		Progress: os.Stdout,
	}

	// Add authentication if token is provided
	if token != "" {
		// For HTTPS URLs, use token as username with empty password
		// This works for both GitHub (PAT) and GitLab (PAT)
		cloneOpts.Auth = &http.BasicAuth{
			Username: token, // GitHub/GitLab PATs can be used as username
			Password: "",    // Leave password empty
		}
	}

	// Clone the repository
	_, err := git.PlainClone(targetPath, false, cloneOpts)
	if err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	return nil
}

// PullExisting pulls the latest changes from the remote for an existing repository without authentication.
// For private repositories, use PullExistingWithAuth instead.
func PullExisting(path string) error {
	return PullExistingWithAuth(path, "")
}

// PullExistingWithAuth pulls the latest changes with optional authentication.
// If token is empty, no authentication is used (for public repos).
func PullExistingWithAuth(path, token string) error {
	repo, err := git.PlainOpen(path)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// Prepare pull options
	pullOpts := &git.PullOptions{
		RemoteName: "origin",
	}

	// Add authentication if token is provided
	if token != "" {
		pullOpts.Auth = &http.BasicAuth{
			Username: token, // GitHub/GitLab PATs can be used as username
			Password: "",    // Leave password empty
		}
	}

	err = worktree.Pull(pullOpts)
	if err != nil {
		// If already up-to-date, that's not an error
		if err == git.NoErrAlreadyUpToDate {
			return nil
		}
		// Check if the error is because there's nothing to pull (e.g., no upstream configured)
		if err == plumbing.ErrReferenceNotFound {
			return fmt.Errorf("no upstream branch configured")
		}
		return fmt.Errorf("failed to pull: %w", err)
	}

	return nil
}

// parseGitURL extracts the owner and repository name from a git URL.
// Supports formats:
//   - https://github.com/owner/repo
//   - https://github.com/owner/repo.git
//   - http://github.com/owner/repo
//   - git@github.com:owner/repo
//   - git@github.com:owner/repo.git
//   - https://gitlab.com/owner/repo
//   - ssh://git@github.com/owner/repo.git
func parseGitURL(url string) (owner, repo string, err error) {
	url = strings.TrimSpace(url)

	// Handle SSH format: git@github.com:owner/repo or git@github.com:owner/repo.git
	if strings.HasPrefix(url, "git@") {
		parts := strings.SplitN(url, ":", 2)
		if len(parts) != 2 {
			return "", "", fmt.Errorf("invalid SSH URL format: %s", url)
		}
		path := parts[1]
		return extractOwnerRepo(path)
	}

	// Handle HTTPS/HTTP format: https://github.com/owner/repo or http://github.com/owner/repo
	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		// Remove protocol
		withoutProtocol := strings.TrimPrefix(url, "https://")
		withoutProtocol = strings.TrimPrefix(withoutProtocol, "http://")

		// Split by / and skip the domain part
		parts := strings.Split(withoutProtocol, "/")
		if len(parts) < 3 {
			return "", "", fmt.Errorf("invalid HTTPS/HTTP URL format: %s", url)
		}
		// parts[0] is domain, we want everything after that
		// Join the rest and pass to extractOwnerRepo to get last two segments
		path := strings.Join(parts[1:], "/")
		return extractOwnerRepo(path)
	}

	// Handle ssh:// format: ssh://git@github.com/owner/repo.git
	if strings.HasPrefix(url, "ssh://") {
		withoutProtocol := strings.TrimPrefix(url, "ssh://")
		// Remove user@ part if present
		if atIndex := strings.Index(withoutProtocol, "@"); atIndex != -1 {
			withoutProtocol = withoutProtocol[atIndex+1:]
		}
		// Now it looks like github.com/owner/repo.git
		parts := strings.Split(withoutProtocol, "/")
		if len(parts) < 3 {
			return "", "", fmt.Errorf("invalid SSH URL format: %s", url)
		}
		// parts[0] is domain, we want everything after that
		// Join the rest and pass to extractOwnerRepo to get last two segments
		path := strings.Join(parts[1:], "/")
		return extractOwnerRepo(path)
	}

	return "", "", fmt.Errorf("unsupported URL format: %s", url)
}

// extractOwnerRepo extracts owner and repo from a path like "owner/repo" or "owner/repo.git"
func extractOwnerRepo(path string) (owner, repo string, err error) {
	path = strings.TrimSpace(path)
	path = strings.TrimSuffix(path, ".git")

	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		return "", "", fmt.Errorf("invalid path format: %s", path)
	}

	// Take the last two parts (handles cases like "a/b/owner/repo")
	owner = parts[len(parts)-2]
	repo = parts[len(parts)-1]

	if owner == "" || repo == "" {
		return "", "", fmt.Errorf("empty owner or repo name")
	}

	return owner, repo, nil
}
