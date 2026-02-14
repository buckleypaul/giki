package cli

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"

	"github.com/buckleypaul/giki/internal/git"
	"github.com/buckleypaul/giki/internal/server"
	"github.com/pkg/browser"
	"github.com/spf13/cobra"
)

var (
	port   int
	branch string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "giki [path-or-url]",
	Short: "Turn any git repository into a browsable wiki",
	Long: `Giki is a CLI tool that turns any git repository into a browsable wiki in the browser.
You can browse local repositories or clone remote ones.`,
	Args: cobra.MaximumNArgs(1),
	RunE: run,
}

func init() {
	rootCmd.Flags().IntVarP(&port, "port", "p", 4242, "Port to run the server on")
	rootCmd.Flags().StringVarP(&branch, "branch", "b", "", "Branch to browse (defaults to HEAD)")
	rootCmd.AddCommand(versionCmd)
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() error {
	return rootCmd.Execute()
}

func run(cmd *cobra.Command, args []string) error {
	// Determine the path or URL
	pathOrURL := "."
	if len(args) == 1 {
		pathOrURL = args[0]
	}

	// Detect if it's a URL or local path
	isURL := isRemoteURL(pathOrURL)

	var absPath string
	var err error

	if isURL {
		// Handle remote repository cloning
		absPath, err = handleRemoteURL(pathOrURL)
		if err != nil {
			return err
		}
	} else {
		// Handle local path
		absPath, err = resolveLocalPath(pathOrURL)
		if err != nil {
			return err
		}
	}

	// Validate the path exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return fmt.Errorf("path does not exist: %s", absPath)
	}

	// Validate it's a git repository and resolve the branch
	provider, err := git.NewLocalProvider(absPath, branch)
	if err != nil {
		return err
	}

	// Check if port is available before starting the server
	if err := checkPortAvailable(port); err != nil {
		return err
	}

	// Create and start the server
	srv := server.New(port, provider)

	// Start server in a goroutine so we can open the browser
	errChan := make(chan error, 1)
	go func() {
		errChan <- srv.Start()
	}()

	// Open browser after a brief moment to let server start
	// TODO: In future, we could make this more robust by waiting for server readiness
	url := fmt.Sprintf("http://localhost:%d", port)
	if err := browser.OpenURL(url); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: could not open browser: %v\n", err)
		fmt.Fprintf(os.Stderr, "Please visit %s manually\n", url)
	}

	// Wait for server to exit (or error)
	return <-errChan
}

// isRemoteURL detects if the given string is a remote repository URL
func isRemoteURL(s string) bool {
	return strings.HasPrefix(s, "http://") ||
		strings.HasPrefix(s, "https://") ||
		strings.HasPrefix(s, "git@")
}

// resolveLocalPath resolves a local path to an absolute path
func resolveLocalPath(path string) (string, error) {
	// If it's already absolute, return as-is
	if filepath.IsAbs(path) {
		return filepath.Clean(path), nil
	}

	// If it's ".", get the current working directory
	if path == "." {
		cwd, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("could not get current working directory: %w", err)
		}
		return cwd, nil
	}

	// Otherwise, make it absolute relative to cwd
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("could not resolve path: %w", err)
	}

	return absPath, nil
}

// checkPortAvailable checks if the given port is available
func checkPortAvailable(port int) error {
	addr := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("port %d is already in use", port)
	}
	listener.Close()
	return nil
}

// handleRemoteURL handles cloning a remote repository
func handleRemoteURL(url string) (string, error) {
	// Check where the repository would be cloned and if it already exists
	path, exists, err := git.GetClonePath(url)
	if err != nil {
		return "", fmt.Errorf("failed to process remote URL: %w", err)
	}

	if exists {
		// Repository already exists - prompt to pull
		if !promptYesNo(fmt.Sprintf("Repository already exists at %s. Pull latest changes?", path), true) {
			// User declined to pull, but we can still serve the existing repo
			fmt.Fprintf(os.Stderr, "Using existing repository at %s\n", path)
			return path, nil
		}

		// User wants to pull
		fmt.Fprintf(os.Stderr, "Pulling latest changes...\n")
		if err := git.PullExisting(path); err != nil {
			// Pull failed, but we can still serve the repo
			fmt.Fprintf(os.Stderr, "Warning: failed to pull: %v\n", err)
			fmt.Fprintf(os.Stderr, "Continuing with existing repository...\n")
		} else {
			fmt.Fprintf(os.Stderr, "Successfully pulled latest changes.\n")
		}
		return path, nil
	}

	// Repository doesn't exist - prompt to clone
	if !promptYesNo(fmt.Sprintf("Clone repository from %s?", url), true) {
		return "", fmt.Errorf("clone cancelled by user")
	}

	// User confirmed - perform the clone
	fmt.Fprintf(os.Stderr, "Cloning repository to %s...\n", path)
	if err := git.CloneRemote(url, path); err != nil {
		return "", fmt.Errorf("clone failed: %w", err)
	}

	fmt.Fprintf(os.Stderr, "Successfully cloned.\n")
	return path, nil
}

// promptYesNo prompts the user for a yes/no response
// defaultYes determines whether Enter defaults to yes (true) or no (false)
func promptYesNo(prompt string, defaultYes bool) bool {
	reader := bufio.NewReader(os.Stdin)

	suffix := " [Y/n] "
	if !defaultYes {
		suffix = " [y/N] "
	}

	fmt.Fprint(os.Stderr, prompt+suffix)

	response, err := reader.ReadString('\n')
	if err != nil {
		// On error, use the default
		return defaultYes
	}

	response = strings.TrimSpace(strings.ToLower(response))

	// Empty response (just Enter) uses default
	if response == "" {
		return defaultYes
	}

	// Explicit yes responses
	if response == "y" || response == "yes" {
		return true
	}

	// Explicit no responses
	if response == "n" || response == "no" {
		return false
	}

	// Anything else uses default
	return defaultYes
}
