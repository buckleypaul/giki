package git

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/format/gitignore"
	"github.com/go-git/go-git/v5/plumbing/object"
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
	return p.buildTreeFromCommit(branch)
}

// buildTreeFromCommit builds a tree from the git object store for a specific branch.
// This returns the committed state only (no uncommitted changes).
func (p *LocalProvider) buildTreeFromCommit(branch string) (*TreeNode, error) {
	// Get the branch reference
	branchRef := plumbing.NewBranchReferenceName(branch)
	ref, err := p.repo.Reference(branchRef, true)
	if err != nil {
		return nil, fmt.Errorf("branch '%s' not found: %w", branch, err)
	}

	// Get the commit object
	commit, err := p.repo.CommitObject(ref.Hash())
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
	}

	// Get the tree object
	tree, err := commit.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get tree: %w", err)
	}

	// Build the tree structure
	root := &TreeNode{
		Name:     "",
		Path:     "",
		IsDir:    true,
		Children: []TreeNode{},
	}

	// Walk the tree recursively
	err = tree.Files().ForEach(func(file *object.File) error {
		p.addPathToTree(root, file.Name)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to walk tree: %w", err)
	}

	// Sort the tree
	p.sortTree(root)

	return root, nil
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
	return p.readFileFromCommit(branch, path)
}

// readFileFromCommit reads a file from the git object store for a specific branch.
// This returns the committed state only (no uncommitted changes).
func (p *LocalProvider) readFileFromCommit(branch, path string) ([]byte, error) {
	// Get the branch reference
	branchRef := plumbing.NewBranchReferenceName(branch)
	ref, err := p.repo.Reference(branchRef, true)
	if err != nil {
		return nil, fmt.Errorf("branch '%s' not found: %w", branch, err)
	}

	// Get the commit object
	commit, err := p.repo.CommitObject(ref.Hash())
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
	}

	// Get the tree object
	tree, err := commit.Tree()
	if err != nil {
		return nil, fmt.Errorf("failed to get tree: %w", err)
	}

	// Get the file from the tree
	file, err := tree.File(path)
	if err != nil {
		// Check if it's a "file not found" error
		if err == object.ErrFileNotFound {
			return nil, fmt.Errorf("file not found")
		}
		return nil, fmt.Errorf("failed to get file: %w", err)
	}

	// Read the file contents
	reader, err := file.Reader()
	if err != nil {
		return nil, fmt.Errorf("failed to get file reader: %w", err)
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file content: %w", err)
	}

	return content, nil
}

// Branches returns a list of all branches in the repository.
// The current HEAD branch is marked as IsDefault.
func (p *LocalProvider) Branches() ([]BranchInfo, error) {
	// Get iterator for all branches
	iter, err := p.repo.Branches()
	if err != nil {
		return nil, fmt.Errorf("failed to list branches: %w", err)
	}
	defer iter.Close()

	var branches []BranchInfo

	// Iterate through all branches
	err = iter.ForEach(func(ref *plumbing.Reference) error {
		// Extract short branch name (e.g., "main" from "refs/heads/main")
		branchName := ref.Name().Short()

		// Mark as default if it matches the current branch
		isDefault := branchName == p.branch

		branches = append(branches, BranchInfo{
			Name:      branchName,
			IsDefault: isDefault,
		})
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to iterate branches: %w", err)
	}

	return branches, nil
}

// Status returns the current repository status.
// Returns source path, current branch, and dirty state (uncommitted changes).
func (p *LocalProvider) Status() (*RepoStatus, error) {
	// Get worktree to check for uncommitted changes
	worktree, err := p.repo.Worktree()
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// Get worktree status
	status, err := worktree.Status()
	if err != nil {
		return nil, fmt.Errorf("failed to get status: %w", err)
	}

	// Determine if working tree is dirty (has uncommitted changes)
	isDirty := !status.IsClean()

	return &RepoStatus{
		Source:  p.path,
		Branch:  p.branch,
		IsDirty: isDirty,
	}, nil
}

// WriteFile writes content to a file at the given path.
// Creates parent directories if they don't exist.
// Writes to the working tree only.
func (p *LocalProvider) WriteFile(path string, content []byte) error {
	// Normalize path: strip leading/trailing slashes, convert to forward slashes
	path = strings.Trim(path, "/")
	path = filepath.ToSlash(path)

	// Validate path is not empty
	if path == "" {
		return fmt.Errorf("path cannot be empty")
	}

	// Security: validate path doesn't escape repository root
	if strings.Contains(path, "..") {
		return fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Convert to OS-specific path separator
	fullPath := filepath.Join(p.path, filepath.FromSlash(path))

	// Create parent directories if they don't exist
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	// Write file content
	if err := os.WriteFile(fullPath, content, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// DeleteFile removes a file at the given path.
// Returns an error if the file doesn't exist or is a directory.
func (p *LocalProvider) DeleteFile(path string) error {
	// Normalize path: strip leading/trailing slashes, convert to forward slashes
	path = strings.Trim(path, "/")
	path = filepath.ToSlash(path)

	// Validate path is not empty
	if path == "" {
		return fmt.Errorf("path cannot be empty")
	}

	// Security: validate path doesn't escape repository root
	if strings.Contains(path, "..") {
		return fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Convert to OS-specific path separator
	fullPath := filepath.Join(p.path, filepath.FromSlash(path))

	// Check if file exists and is not a directory
	info, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("file not found")
		}
		return fmt.Errorf("failed to stat file: %w", err)
	}

	if info.IsDir() {
		return fmt.Errorf("path is a directory, not a file")
	}

	// Delete the file
	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// MoveFile moves/renames a file from oldPath to newPath.
// Creates parent directories for newPath if they don't exist.
// Returns an error if oldPath doesn't exist or is a directory,
// or if newPath already exists.
func (p *LocalProvider) MoveFile(oldPath, newPath string) error {
	// Normalize paths: strip leading/trailing slashes, convert to forward slashes
	oldPath = strings.Trim(oldPath, "/")
	oldPath = filepath.ToSlash(oldPath)
	newPath = strings.Trim(newPath, "/")
	newPath = filepath.ToSlash(newPath)

	// Validate paths are not empty
	if oldPath == "" || newPath == "" {
		return fmt.Errorf("paths cannot be empty")
	}

	// Security: validate paths don't escape repository root
	if strings.Contains(oldPath, "..") || strings.Contains(newPath, "..") {
		return fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Convert to OS-specific path separators
	oldFullPath := filepath.Join(p.path, filepath.FromSlash(oldPath))
	newFullPath := filepath.Join(p.path, filepath.FromSlash(newPath))

	// Check if old file exists and is not a directory
	info, err := os.Stat(oldFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("source file not found")
		}
		return fmt.Errorf("failed to stat source file: %w", err)
	}

	if info.IsDir() {
		return fmt.Errorf("source path is a directory, not a file")
	}

	// Check if new path already exists
	if _, err := os.Stat(newFullPath); err == nil {
		return fmt.Errorf("destination file already exists")
	}

	// Create parent directories for new path if they don't exist
	dir := filepath.Dir(newFullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	// Move/rename the file
	if err := os.Rename(oldFullPath, newFullPath); err != nil {
		return fmt.Errorf("failed to move file: %w", err)
	}

	return nil
}

// MoveFolder moves/renames a folder from oldPath to newPath.
// This operation moves all files within the folder recursively.
func (p *LocalProvider) MoveFolder(oldPath, newPath string) error {
	// Normalize paths: strip leading/trailing slashes, convert to forward slashes
	oldPath = strings.Trim(oldPath, "/")
	oldPath = filepath.ToSlash(oldPath)
	newPath = strings.Trim(newPath, "/")
	newPath = filepath.ToSlash(newPath)

	// Validate paths are not empty
	if oldPath == "" || newPath == "" {
		return fmt.Errorf("paths cannot be empty")
	}

	// Security: validate paths don't escape repository root
	if strings.Contains(oldPath, "..") || strings.Contains(newPath, "..") {
		return fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Prevent moving a folder into itself (e.g., "foo" -> "foo/bar")
	if strings.HasPrefix(newPath, oldPath+"/") {
		return fmt.Errorf("cannot move folder into itself")
	}

	// Convert to OS-specific path separators
	oldFullPath := filepath.Join(p.path, filepath.FromSlash(oldPath))
	newFullPath := filepath.Join(p.path, filepath.FromSlash(newPath))

	// Check if old folder exists and is a directory
	info, err := os.Stat(oldFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("source folder not found")
		}
		return fmt.Errorf("failed to stat source folder: %w", err)
	}

	if !info.IsDir() {
		return fmt.Errorf("source path is not a directory")
	}

	// Check if new path already exists
	if _, err := os.Stat(newFullPath); err == nil {
		return fmt.Errorf("destination folder already exists")
	}

	// Create parent directories for new path if they don't exist
	parentDir := filepath.Dir(newFullPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("failed to create parent directories: %w", err)
	}

	// Move/rename the folder
	if err := os.Rename(oldFullPath, newFullPath); err != nil {
		return fmt.Errorf("failed to move folder: %w", err)
	}

	return nil
}

// Commit creates a git commit with all staged and unstaged changes.
// Returns the commit hash on success.
// Requires a non-empty commit message.
func (p *LocalProvider) Commit(message string) (string, error) {
	// Validate message is not empty
	message = strings.TrimSpace(message)
	if message == "" {
		return "", fmt.Errorf("commit message cannot be empty")
	}

	// Get worktree
	worktree, err := p.repo.Worktree()
	if err != nil {
		return "", fmt.Errorf("failed to get worktree: %w", err)
	}

	// Stage all changes (git add .)
	err = worktree.AddWithOptions(&git.AddOptions{All: true})
	if err != nil {
		return "", fmt.Errorf("failed to stage changes: %w", err)
	}

	// Create commit
	// TODO: In Step 25, this signature will be customizable via config
	hash, err := worktree.Commit(message, &git.CommitOptions{
		Author: &object.Signature{
			Name:  "Giki User",
			Email: "user@giki.local",
			When:  time.Now(),
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to create commit: %w", err)
	}

	return hash.String(), nil
}

// SearchFileNames performs fuzzy filename matching against all files in the repository.
// Returns paths matching the query, sorted by relevance (exact matches first).
// Only searches files, not directories. Respects .gitignore rules.
func (p *LocalProvider) SearchFileNames(query string) ([]string, error) {
	if query == "" {
		return []string{}, nil
	}

	// Normalize query to lowercase for case-insensitive matching
	queryLower := strings.ToLower(query)

	// Get all files in the repository (current branch)
	tree, err := p.buildWorkingTreeWithIgnore()
	if err != nil {
		return nil, fmt.Errorf("failed to build file tree: %w", err)
	}

	// Collect all file paths from tree
	var allFiles []string
	p.collectFilePaths(tree, &allFiles)

	// Score and filter files based on fuzzy match
	type scoredPath struct {
		path  string
		score int
	}
	var matches []scoredPath

	for _, path := range allFiles {
		pathLower := strings.ToLower(path)
		score := p.fuzzyMatchScore(queryLower, pathLower)
		if score > 0 {
			matches = append(matches, scoredPath{path: path, score: score})
		}
	}

	// Sort by score (higher is better), then by path length (shorter is better)
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].score != matches[j].score {
			return matches[i].score > matches[j].score
		}
		return len(matches[i].path) < len(matches[j].path)
	})

	// Extract paths from scored results (limit to 50)
	var results []string
	limit := 50
	for i, match := range matches {
		if i >= limit {
			break
		}
		results = append(results, match.path)
	}

	return results, nil
}

// collectFilePaths recursively collects all file paths from a tree node.
func (p *LocalProvider) collectFilePaths(node *TreeNode, paths *[]string) {
	if !node.IsDir && node.Path != "" {
		*paths = append(*paths, node.Path)
		return
	}

	for _, child := range node.Children {
		p.collectFilePaths(&child, paths)
	}
}

// fuzzyMatchScore calculates a score for how well the query matches the path.
// Returns 0 if no match, higher scores for better matches.
// Scoring:
// - 1000 for exact match
// - 100 for exact substring match
// - 50 for matching all characters in order
// - 0 for no match
func (p *LocalProvider) fuzzyMatchScore(query, path string) int {
	// Exact match
	if query == path {
		return 1000
	}

	// Exact substring match
	if strings.Contains(path, query) {
		return 100
	}

	// Fuzzy match: all characters in order
	queryIdx := 0
	for _, char := range path {
		if queryIdx < len(query) && byte(char) == query[queryIdx] {
			queryIdx++
		}
	}

	if queryIdx == len(query) {
		return 50
	}

	return 0
}

// SearchContent performs full-text search across all files in the repository.
// Returns matches with line numbers and surrounding context (2-3 lines).
// Skips binary files. Case-insensitive search.
func (p *LocalProvider) SearchContent(query string) ([]SearchResult, error) {
	if query == "" {
		return []SearchResult{}, nil
	}

	// Normalize query to lowercase for case-insensitive search
	queryLower := strings.ToLower(query)

	// Get all files in the repository (current branch)
	tree, err := p.buildWorkingTreeWithIgnore()
	if err != nil {
		return nil, fmt.Errorf("failed to build file tree: %w", err)
	}

	// Collect all file paths from tree
	var allFiles []string
	p.collectFilePaths(tree, &allFiles)

	// Search each file for matches
	var results []SearchResult
	maxResults := 50

	for _, filePath := range allFiles {
		if len(results) >= maxResults {
			break
		}

		// Read file content
		fullPath := filepath.Join(p.path, filepath.FromSlash(filePath))
		content, err := os.ReadFile(fullPath)
		if err != nil {
			// Skip files that can't be read
			continue
		}

		// Skip binary files
		if !p.isTextFile(content) {
			continue
		}

		// Search line-by-line
		scanner := bufio.NewScanner(bytes.NewReader(content))
		lineNumber := 0
		var prevLines []string // Keep last 2 lines for context

		for scanner.Scan() {
			lineNumber++
			line := scanner.Text()
			lineLower := strings.ToLower(line)

			// Check if this line contains the query
			if strings.Contains(lineLower, queryLower) {
				// Find the exact match text (preserve case)
				matchStart := strings.Index(lineLower, queryLower)
				matchText := line[matchStart : matchStart+len(query)]

				// Build context: previous line(s), current line, next line(s)
				context := make([]string, 0, 3)

				// Add previous lines (up to 1)
				if len(prevLines) > 0 {
					context = append(context, prevLines[len(prevLines)-1])
				}

				// Add current line (match)
				context = append(context, line)

				// Try to read next line for context
				if scanner.Scan() {
					nextLine := scanner.Text()
					context = append(context, nextLine)
					lineNumber++
					// Update prevLines to include current and next
					prevLines = []string{line, nextLine}
				} else {
					// No next line, update prevLines with just current
					prevLines = []string{line}
				}

				results = append(results, SearchResult{
					Path:       filePath,
					LineNumber: lineNumber - len(context) + len(prevLines), // Adjust to match line
					Context:    context,
					MatchText:  matchText,
				})

				if len(results) >= maxResults {
					break
				}

				continue
			}

			// Update prevLines buffer (keep last 2 lines)
			prevLines = append(prevLines, line)
			if len(prevLines) > 2 {
				prevLines = prevLines[1:]
			}
		}

		if err := scanner.Err(); err != nil {
			// Skip files with scan errors
			continue
		}
	}

	return results, nil
}

// isTextFile checks if the content is likely a text file (not binary).
// Uses simple heuristics: valid UTF-8 and no null bytes in first 8KB.
func (p *LocalProvider) isTextFile(content []byte) bool {
	// Empty files are text
	if len(content) == 0 {
		return true
	}

	// Check first 8KB (or less if file is smaller)
	sampleSize := 8192
	if len(content) < sampleSize {
		sampleSize = len(content)
	}
	sample := content[:sampleSize]

	// Check for null bytes (strong indicator of binary)
	if bytes.Contains(sample, []byte{0}) {
		return false
	}

	// Check if valid UTF-8
	return utf8.Valid(sample)
}
