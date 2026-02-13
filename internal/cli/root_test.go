package cli

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIsRemoteURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"HTTP URL", "http://github.com/org/repo", true},
		{"HTTPS URL", "https://github.com/org/repo", true},
		{"Git SSH URL", "git@github.com:org/repo.git", true},
		{"Local path", "/tmp/path", false},
		{"Relative path", "./path", false},
		{"Dot", ".", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isRemoteURL(tt.input)
			if result != tt.expected {
				t.Errorf("isRemoteURL(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestResolveLocalPath(t *testing.T) {
	t.Run("Dot resolves to cwd", func(t *testing.T) {
		expected, err := os.Getwd()
		if err != nil {
			t.Fatalf("Failed to get cwd: %v", err)
		}

		result, err := resolveLocalPath(".")
		if err != nil {
			t.Fatalf("resolveLocalPath('.') returned error: %v", err)
		}

		if result != expected {
			t.Errorf("resolveLocalPath('.') = %q, want %q", result, expected)
		}
	})

	t.Run("Absolute path returned as-is", func(t *testing.T) {
		absPath := filepath.Join(string(filepath.Separator), "tmp", "path")
		result, err := resolveLocalPath(absPath)
		if err != nil {
			t.Fatalf("resolveLocalPath(%q) returned error: %v", absPath, err)
		}

		// Clean the path for comparison
		expected := filepath.Clean(absPath)
		if result != expected {
			t.Errorf("resolveLocalPath(%q) = %q, want %q", absPath, result, expected)
		}
	})

	t.Run("Relative path made absolute", func(t *testing.T) {
		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("Failed to get cwd: %v", err)
		}

		relativePath := "some/relative/path"
		result, err := resolveLocalPath(relativePath)
		if err != nil {
			t.Fatalf("resolveLocalPath(%q) returned error: %v", relativePath, err)
		}

		expected := filepath.Join(cwd, relativePath)
		if result != expected {
			t.Errorf("resolveLocalPath(%q) = %q, want %q", relativePath, result, expected)
		}
	})
}

func TestCheckPortAvailable(t *testing.T) {
	t.Run("Available port succeeds", func(t *testing.T) {
		// Use a high port number that's likely to be available
		err := checkPortAvailable(59999)
		if err != nil {
			t.Errorf("checkPortAvailable(59999) returned error: %v", err)
		}
	})

	t.Run("Port 0 is special and should succeed", func(t *testing.T) {
		// Port 0 tells the OS to assign an available port
		err := checkPortAvailable(0)
		if err != nil {
			t.Errorf("checkPortAvailable(0) returned error: %v", err)
		}
	})
}

// Integration-style tests for the root command execution
// Note: These tests verify the command setup and argument parsing,
// but do NOT actually start the server to avoid side effects

func TestRootCmdFlags(t *testing.T) {
	t.Run("Port flag sets port", func(t *testing.T) {
		// Save original value
		origPort := port
		defer func() { port = origPort }()

		rootCmd.ParseFlags([]string{"--port", "9090"})

		if port != 9090 {
			t.Errorf("After --port 9090, port = %d, want 9090", port)
		}
	})

	t.Run("Short port flag -p sets port", func(t *testing.T) {
		// Save original value
		origPort := port
		defer func() { port = origPort }()

		rootCmd.ParseFlags([]string{"-p", "8080"})

		if port != 8080 {
			t.Errorf("After -p 8080, port = %d, want 8080", port)
		}
	})

	t.Run("Branch flag sets branch", func(t *testing.T) {
		// Save original value
		origBranch := branch
		defer func() { branch = origBranch }()

		rootCmd.ParseFlags([]string{"--branch", "dev"})

		if branch != "dev" {
			t.Errorf("After --branch dev, branch = %q, want 'dev'", branch)
		}
	})

	t.Run("Short branch flag -b sets branch", func(t *testing.T) {
		// Save original value
		origBranch := branch
		defer func() { branch = origBranch }()

		rootCmd.ParseFlags([]string{"-b", "feature/test"})

		if branch != "feature/test" {
			t.Errorf("After -b feature/test, branch = %q, want 'feature/test'", branch)
		}
	})
}

func TestRootCmdArgs(t *testing.T) {
	t.Run("No args defaults to dot", func(t *testing.T) {
		// We can't easily test the full command execution without side effects,
		// but we can verify the Args validator
		err := rootCmd.Args(rootCmd, []string{})
		if err != nil {
			t.Errorf("Args with no arguments returned error: %v", err)
		}
	})

	t.Run("One arg is accepted", func(t *testing.T) {
		err := rootCmd.Args(rootCmd, []string{"/some/path"})
		if err != nil {
			t.Errorf("Args with one argument returned error: %v", err)
		}
	})

	t.Run("Two args returns error", func(t *testing.T) {
		err := rootCmd.Args(rootCmd, []string{"/path/one", "/path/two"})
		if err == nil {
			t.Error("Args with two arguments should return error, but didn't")
		}
	})
}
