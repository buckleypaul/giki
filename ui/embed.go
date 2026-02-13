package ui

import "embed"

// Dist holds the embedded frontend build files.
// The dist directory is created by running 'npm run build' in the ui directory.
//
//go:embed dist
var Dist embed.FS
