package main

import (
	"os"

	"github.com/buckleypaul/giki/internal/cli"
)

func main() {
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
