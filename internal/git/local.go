package git

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/format/gitignore"
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
// For the current branch, reads from working tree (includes uncommitted changes).
// For other branches, reads from git object store (committed state only).
// Respects .gitignore rules.
func (p *LocalProvider) Tree(branch string) (*TreeNode, error) {
	// Determine if this is the current/HEAD branch
	isCurrentBranch := (branch == "" || branch == p.branch)

	if isCurrentBranch {
		// Read from working tree (includes uncommitted changes)
		return p.buildWorkingTreeWithIgnore()
	}

	// For other branches, read from git object store (committed state only)
	// This will be implemented when we need branch switching (Step 15)
	return nil, fmt.Errorf("reading non-current branches not yet implemented")
}

// buildWorkingTreeWithIgnore builds a tree from the working directory,
// combining tracked and untracked files, respecting .gitignore rules.
func (p *LocalProvider) buildWorkingTreeWithIgnore() (*TreeNode, error) {
	worktree, err := p.repo.Worktree()
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// Load .gitignore patterns
	patterns, err := p.loadGitignorePatterns()
	if err != nil {
		return nil, fmt.Errorf("failed to load .gitignore: %w", err)
	}

	// Build set of all files (tracked + untracked non-ignored)
	files := make(map[string]bool)

	// Get worktree status to find tracked and untracked files
	status, err := worktree.Status()
	if err != nil {
		return nil, fmt.Errorf("failed to get status: %w", err)
	}

	// Add all files from status (both tracked and untracked)
	for path, fileStatus := range status {
		// Skip deleted files
		if fileStatus.Worktree == git.Deleted {
			continue
		}

		// Check if file should be ignored
		if p.shouldIgnore(path, patterns, false) {
			continue
		}

		files[path] = true
	}

	// Walk the filesystem to catch any files not in status
	// (fully committed, unmodified files)
	err = filepath.Walk(p.path, func(absPath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Get relative path
		relPath, err := filepath.Rel(p.path, absPath)
		if err != nil {
			return err
		}

		// Skip the .git directory itself
		if relPath == ".git" || strings.HasPrefix(relPath, ".git"+string(filepath.Separator)) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip root directory
		if relPath == "." {
			return nil
		}

		// Skip directories (we only track files; directories are implicit)
		if info.IsDir() {
			return nil
		}

		// Check if should be ignored
		if p.shouldIgnore(relPath, patterns, info.IsDir()) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Normalize path separators to forward slashes (git convention)
		gitPath := filepath.ToSlash(relPath)
		files[gitPath] = true

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk filesystem: %w", err)
	}

	// Convert file set to sorted slice
	var filePaths []string
	for path := range files {
		filePaths = append(filePaths, path)
	}
	sort.Strings(filePaths)

	// Build nested tree structure
	root := &TreeNode{
		Name:     "",
		Path:     "",
		IsDir:    true,
		Children: []TreeNode{},
	}

	for _, path := range filePaths {
		p.addPathToTree(root, path)
	}

	// Sort tree (directories first, then alphabetically)
	p.sortTree(root)

	return root, nil
}

// loadGitignorePatterns loads .gitignore patterns from the repository.
func (p *LocalProvider) loadGitignorePatterns() ([]gitignore.Pattern, error) {
	var patterns []gitignore.Pattern

	// Read .gitignore file if it exists
	gitignorePath := filepath.Join(p.path, ".gitignore")
	if _, err := os.Stat(gitignorePath); err == nil {
		content, err := os.ReadFile(gitignorePath)
		if err != nil {
			return nil, err
		}

		// Parse patterns
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			// Skip empty lines and comments
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			patterns = append(patterns, gitignore.ParsePattern(line, nil))
		}
	}

	return patterns, nil
}

// shouldIgnore checks if a path should be ignored based on .gitignore patterns.
func (p *LocalProvider) shouldIgnore(path string, patterns []gitignore.Pattern, isDir bool) bool {
	// Normalize to forward slashes for matching
	path = filepath.ToSlash(path)

	// Split path into parts for matching
	parts := strings.Split(path, "/")

	// Check against patterns
	matcher := gitignore.NewMatcher(patterns)
	return matcher.Match(parts, isDir)
}

// addPathToTree adds a file path to the tree structure.
func (p *LocalProvider) addPathToTree(root *TreeNode, path string) {
	parts := strings.Split(path, "/")
	current := root

	for i, part := range parts {
		isLastPart := i == len(parts)-1

		// Look for existing child with this name
		var found *TreeNode
		for j := range current.Children {
			if current.Children[j].Name == part {
				found = &current.Children[j]
				break
			}
		}

		if found != nil {
			current = found
		} else {
			// Create new node
			fullPath := strings.Join(parts[:i+1], "/")
			newNode := TreeNode{
				Name:     part,
				Path:     fullPath,
				IsDir:    !isLastPart,
				Children: []TreeNode{},
			}

			current.Children = append(current.Children, newNode)
			current = &current.Children[len(current.Children)-1]
		}
	}
}

// sortTree sorts the tree recursively: directories first, then files, both alphabetically (case-insensitive).
func (p *LocalProvider) sortTree(node *TreeNode) {
	if len(node.Children) == 0 {
		return
	}

	// Sort children
	sort.Slice(node.Children, func(i, j int) bool {
		// Directories come before files
		if node.Children[i].IsDir != node.Children[j].IsDir {
			return node.Children[i].IsDir
		}

		// Within same type, sort alphabetically (case-insensitive)
		return strings.ToLower(node.Children[i].Name) < strings.ToLower(node.Children[j].Name)
	})

	// Recursively sort children
	for i := range node.Children {
		p.sortTree(&node.Children[i])
	}
}

// FileContent returns the raw bytes of a file at the given path.
// For the current branch, reads from working tree (includes uncommitted changes).
// For other branches, reads from git object store (committed state only).
func (p *LocalProvider) FileContent(path, branch string) ([]byte, error) {
	// Normalize path: strip leading/trailing slashes, convert to forward slashes
	path = strings.Trim(path, "/")
	path = filepath.ToSlash(path)

	// Validate path is not empty
	if path == "" {
		return nil, fmt.Errorf("file not found")
	}

	// Security: validate path doesn't escape repository root
	if strings.Contains(path, "..") {
		return nil, fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Determine if this is the current/HEAD branch
	isCurrentBranch := (branch == "" || branch == p.branch)

	if isCurrentBranch {
		// Read from working tree (includes uncommitted changes)
		fullPath := filepath.Join(p.path, filepath.FromSlash(path))

		// Check if file exists
		info, err := os.Stat(fullPath)
		if err != nil {
			if os.IsNotExist(err) {
				return nil, fmt.Errorf("file not found")
			}
			return nil, fmt.Errorf("failed to stat file: %w", err)
		}

		// Verify it's a file, not a directory
		if info.IsDir() {
			return nil, fmt.Errorf("path is a directory, not a file")
		}

		// Read file content
		content, err := os.ReadFile(fullPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read file: %w", err)
		}

		return content, nil
	}

	// For other branches, read from git object store (committed state only)
	// This will be implemented when we need branch switching (Step 15)
	return nil, fmt.Errorf("reading non-current branches not yet implemented")
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
