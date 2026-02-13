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

// TestTree_KnownStructure tests that Tree returns the expected structure for a known repo.
func TestTree_KnownStructure(t *testing.T) {
	// Create a temporary git repository with a known structure
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create files and directories:
	// - README.md (root)
	// - docs/
	//   - setup.md
	// - src/
	//   - main.go
	//   - utils/
	//     - helper.go
	files := map[string]string{
		"README.md":         "# Test",
		"docs/setup.md":     "# Setup",
		"src/main.go":       "package main",
		"src/utils/helper.go": "package utils",
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

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and get tree
	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	tree, err := provider.Tree("")
	if err != nil {
		t.Fatalf("Tree() failed: %v", err)
	}

	// Verify root has 3 children: docs (dir), src (dir), README.md (file)
	if len(tree.Children) != 3 {
		t.Errorf("expected 3 root children, got %d", len(tree.Children))
	}

	// Verify sort order: directories first (docs, src), then files (README.md)
	if len(tree.Children) >= 3 {
		if !tree.Children[0].IsDir || tree.Children[0].Name != "docs" {
			t.Errorf("expected first child to be 'docs' directory, got: %+v", tree.Children[0])
		}
		if !tree.Children[1].IsDir || tree.Children[1].Name != "src" {
			t.Errorf("expected second child to be 'src' directory, got: %+v", tree.Children[1])
		}
		if tree.Children[2].IsDir || tree.Children[2].Name != "README.md" {
			t.Errorf("expected third child to be 'README.md' file, got: %+v", tree.Children[2])
		}

		// Verify docs has 1 child: setup.md
		if len(tree.Children[0].Children) != 1 {
			t.Errorf("expected docs to have 1 child, got %d", len(tree.Children[0].Children))
		} else {
			if tree.Children[0].Children[0].Name != "setup.md" {
				t.Errorf("expected docs child to be 'setup.md', got %s", tree.Children[0].Children[0].Name)
			}
		}

		// Verify src has 2 children: utils (dir), main.go (file)
		if len(tree.Children[1].Children) != 2 {
			t.Errorf("expected src to have 2 children, got %d", len(tree.Children[1].Children))
		} else {
			if !tree.Children[1].Children[0].IsDir || tree.Children[1].Children[0].Name != "utils" {
				t.Errorf("expected src first child to be 'utils' directory, got: %+v", tree.Children[1].Children[0])
			}
			if tree.Children[1].Children[1].IsDir || tree.Children[1].Children[1].Name != "main.go" {
				t.Errorf("expected src second child to be 'main.go' file, got: %+v", tree.Children[1].Children[1])
			}
		}
	}
}

// TestTree_GitignoreExcluded tests that .gitignore'd files are excluded from tree.
func TestTree_GitignoreExcluded(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create .gitignore
	gitignoreContent := `# Ignore node_modules
node_modules/
*.log
build/
`
	if err := os.WriteFile(filepath.Join(tempDir, ".gitignore"), []byte(gitignoreContent), 0644); err != nil {
		t.Fatalf("failed to write .gitignore: %v", err)
	}

	// Create files: some tracked, some ignored
	files := map[string]string{
		".gitignore":            gitignoreContent,
		"README.md":             "# Test",
		"src/main.go":           "package main",
		"node_modules/pkg.json": `{"name": "test"}`, // Should be ignored
		"debug.log":             "log content",      // Should be ignored
		"build/output.js":       "var x = 1;",       // Should be ignored
	}

	for path, content := range files {
		fullPath := filepath.Join(tempDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			t.Fatalf("failed to write file %s: %v", path, err)
		}
	}

	// Only add non-ignored files to git
	for _, path := range []string{".gitignore", "README.md", "src/main.go"} {
		if _, err := w.Add(path); err != nil {
			t.Fatalf("failed to add file %s: %v", path, err)
		}
	}

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	// Create provider and get tree
	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	tree, err := provider.Tree("")
	if err != nil {
		t.Fatalf("Tree() failed: %v", err)
	}

	// Helper function to find a node by path
	hasPath := func(node *TreeNode, targetPath string) bool {
		var search func(*TreeNode, string) bool
		search = func(n *TreeNode, path string) bool {
			if n.Path == path {
				return true
			}
			for i := range n.Children {
				if search(&n.Children[i], path) {
					return true
				}
			}
			return false
		}
		return search(node, targetPath)
	}

	// Verify tracked files are present
	if !hasPath(tree, ".gitignore") {
		t.Error(".gitignore should be in tree")
	}
	if !hasPath(tree, "README.md") {
		t.Error("README.md should be in tree")
	}
	if !hasPath(tree, "src/main.go") {
		t.Error("src/main.go should be in tree")
	}

	// Verify ignored files are NOT present
	if hasPath(tree, "node_modules/pkg.json") {
		t.Error("node_modules/pkg.json should be ignored")
	}
	if hasPath(tree, "debug.log") {
		t.Error("debug.log should be ignored")
	}
	if hasPath(tree, "build/output.js") {
		t.Error("build/output.js should be ignored")
	}
}

// TestTree_TrackedDotfilesIncluded tests that tracked dotfiles are included.
func TestTree_TrackedDotfilesIncluded(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create dotfiles and directory
	files := []string{
		".gitignore",
		".github/workflows/ci.yml",
		"README.md",
	}

	for _, path := range files {
		fullPath := filepath.Join(tempDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		if err := os.WriteFile(fullPath, []byte("content"), 0644); err != nil {
			t.Fatalf("failed to write file %s: %v", path, err)
		}
		if _, err := w.Add(path); err != nil {
			t.Fatalf("failed to add file %s: %v", path, err)
		}
	}

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	tree, err := provider.Tree("")
	if err != nil {
		t.Fatalf("Tree() failed: %v", err)
	}

	// Helper function to find a node by path
	hasPath := func(node *TreeNode, targetPath string) bool {
		var search func(*TreeNode, string) bool
		search = func(n *TreeNode, path string) bool {
			if n.Path == path {
				return true
			}
			for i := range n.Children {
				if search(&n.Children[i], path) {
					return true
				}
			}
			return false
		}
		return search(node, targetPath)
	}

	if !hasPath(tree, ".gitignore") {
		t.Error(".gitignore should be in tree")
	}
	if !hasPath(tree, ".github/workflows/ci.yml") {
		t.Error(".github/workflows/ci.yml should be in tree")
	}
}

// TestTree_SortOrderCorrect tests that sort order is correct (directories first, alphabetical).
func TestTree_SortOrderCorrect(t *testing.T) {
	tempDir := t.TempDir()
	repo, err := git.PlainInit(tempDir, false)
	if err != nil {
		t.Fatalf("failed to init test repo: %v", err)
	}

	w, err := repo.Worktree()
	if err != nil {
		t.Fatalf("failed to get worktree: %v", err)
	}

	// Create files with names that test alphabetical sorting
	files := []string{
		"zebra.md",
		"apple.md",
		"Beta.md", // capital B - should still sort alphabetically (case-insensitive)
		"zoo/",
		"ant/",
	}

	for _, path := range files {
		fullPath := filepath.Join(tempDir, path)
		if strings.HasSuffix(path, "/") {
			// Directory - create a file inside it
			if err := os.MkdirAll(fullPath, 0755); err != nil {
				t.Fatalf("failed to create directory: %v", err)
			}
			filePath := filepath.Join(fullPath, "file.txt")
			if err := os.WriteFile(filePath, []byte("content"), 0644); err != nil {
				t.Fatalf("failed to write file: %v", err)
			}
			if _, err := w.Add(strings.TrimSuffix(path, "/") + "/file.txt"); err != nil {
				t.Fatalf("failed to add file: %v", err)
			}
		} else {
			if err := os.WriteFile(fullPath, []byte("content"), 0644); err != nil {
				t.Fatalf("failed to write file: %v", err)
			}
			if _, err := w.Add(path); err != nil {
				t.Fatalf("failed to add file: %v", err)
			}
		}
	}

	if _, err := w.Commit("initial commit", &git.CommitOptions{}); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	tree, err := provider.Tree("")
	if err != nil {
		t.Fatalf("Tree() failed: %v", err)
	}

	// Expected order: ant (dir), zoo (dir), apple.md, Beta.md, zebra.md
	expected := []struct {
		name  string
		isDir bool
	}{
		{"ant", true},
		{"zoo", true},
		{"apple.md", false},
		{"Beta.md", false},
		{"zebra.md", false},
	}

	if len(tree.Children) != len(expected) {
		t.Fatalf("expected %d children, got %d", len(expected), len(tree.Children))
	}

	for i, exp := range expected {
		if tree.Children[i].Name != exp.name {
			t.Errorf("child %d: expected name %q, got %q", i, exp.name, tree.Children[i].Name)
		}
		if tree.Children[i].IsDir != exp.isDir {
			t.Errorf("child %d (%s): expected IsDir=%v, got %v", i, exp.name, exp.isDir, tree.Children[i].IsDir)
		}
	}
}
