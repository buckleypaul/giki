package git

import (
	"fmt"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// LocalProvider implements GitProvider for local git repositories.
// It reads from the working tree for the current branch (showing uncommitted changes)
// and from git object store for other branches (committed state only).
type LocalProvider struct {
	repo   *git.Repository
	path   string
	branch string
}

// NewLocalProvider creates a new LocalProvider for the given path and branch.
// If branch is empty, uses the current HEAD branch.
// Returns an error if:
// - path is not a git repository
// - branch does not exist
func NewLocalProvider(path, branch string) (*LocalProvider, error) {
	// Open the git repository
	repo, err := git.PlainOpen(path)
	if err != nil {
		// go-git returns "repository does not exist" for non-git directories
		return nil, fmt.Errorf("%s is not a git repository", path)
	}

	// If branch is specified, validate it exists
	if branch != "" {
		branchRef := plumbing.NewBranchReferenceName(branch)
		_, err := repo.Reference(branchRef, true)
		if err != nil {
			return nil, fmt.Errorf("branch '%s' not found", branch)
		}
	} else {
		// If no branch specified, resolve HEAD to get current branch
		head, err := repo.Head()
		if err != nil {
			return nil, fmt.Errorf("failed to resolve HEAD: %w", err)
		}

		// Extract branch name from HEAD reference
		if head.Name().IsBranch() {
			branch = head.Name().Short()
		} else {
			// Detached HEAD state - use "HEAD"
			branch = "HEAD"
		}
	}

	return &LocalProvider{
		repo:   repo,
		path:   path,
		branch: branch,
	}, nil
}

// Tree returns the complete file tree for the given branch.
// Implementation deferred to Phase 2 (Step 6).
func (p *LocalProvider) Tree(branch string) (*TreeNode, error) {
	return nil, fmt.Errorf("Tree not yet implemented")
}

// FileContent returns the raw bytes of a file at the given path.
// Implementation deferred to Phase 2 (Step 7).
func (p *LocalProvider) FileContent(path, branch string) ([]byte, error) {
	return nil, fmt.Errorf("FileContent not yet implemented")
}

// Branches returns a list of all branches in the repository.
// Implementation deferred to Phase 2 (Step 8).
func (p *LocalProvider) Branches() ([]BranchInfo, error) {
	return nil, fmt.Errorf("Branches not yet implemented")
}

// Status returns the current repository status.
// Implementation deferred to Phase 2 (Step 9).
func (p *LocalProvider) Status() (*RepoStatus, error) {
	return nil, fmt.Errorf("Status not yet implemented")
}
