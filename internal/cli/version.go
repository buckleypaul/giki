package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

// Version information (injected at build time via ldflags)
var (
	Version = "dev"
	Commit  = "none"
	Date    = "unknown"
)

// versionCmd represents the version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Long:  `Display the version, commit hash, and build date of giki.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("giki version %s\n", Version)
		fmt.Printf("  commit: %s\n", Commit)
		fmt.Printf("  built:  %s\n", Date)
	},
}
