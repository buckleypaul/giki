package git

// GitProvider defines the interface for interacting with git repositories.
// Implementations include LocalProvider (working tree + git objects) and
// future remote providers (API-based browsing).
type GitProvider interface {
	// Tree returns the complete file tree for the given branch.
	// For the current branch, includes uncommitted changes from working tree.
	// For other branches, reads from git object store (committed state only).
	Tree(branch string) (*TreeNode, error)

	// FileContent returns the raw bytes of a file at the given path on the given branch.
	// Returns an error if the file does not exist.
	FileContent(path, branch string) ([]byte, error)

	// Branches returns a list of all branches in the repository.
	Branches() ([]BranchInfo, error)

	// Status returns the current repository status (branch, dirty state, etc.).
	Status() (*RepoStatus, error)

	// WriteFile writes content to a file at the given path.
	// Creates parent directories if they don't exist.
	WriteFile(path string, content []byte) error

	// DeleteFile removes a file at the given path.
	DeleteFile(path string) error

	// MoveFile moves/renames a file from oldPath to newPath.
	MoveFile(oldPath, newPath string) error

	// MoveFolder moves/renames a folder from oldPath to newPath.
	// This operation moves all files within the folder recursively.
	MoveFolder(oldPath, newPath string) error

	// Commit creates a git commit with all staged and unstaged changes.
	// Returns the commit hash on success.
	Commit(message string) (string, error)

	// SearchFileNames performs fuzzy filename matching against all files in the repository.
	// Returns paths matching the query, sorted by relevance.
	SearchFileNames(query string) ([]string, error)

	// SearchContent performs full-text search across all files in the repository.
	// Returns matches with line numbers and surrounding context.
	SearchContent(query string) ([]SearchResult, error)
}

// TreeNode represents a file or directory in the repository tree.
type TreeNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []TreeNode  `json:"children,omitempty"`
}

// BranchInfo represents a single git branch.
type BranchInfo struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"isDefault"` // true for HEAD branch
}

// RepoStatus represents the current state of the repository.
type RepoStatus struct {
	Source  string `json:"source"`  // local path or remote URL
	Branch  string `json:"branch"`  // current branch name
	IsDirty bool   `json:"isDirty"` // true if working tree has uncommitted changes
}

// SearchResult represents a single content search match.
type SearchResult struct {
	Path       string   `json:"path"`       // file path
	LineNumber int      `json:"lineNumber"` // 1-indexed line number
	Context    []string `json:"context"`    // surrounding lines (before, match, after)
	MatchText  string   `json:"matchText"`  // the matched text for highlighting
}
