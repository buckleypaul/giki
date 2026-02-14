# Giki Architecture

## Overview

Giki is a Go CLI tool that turns any git repository into a browsable wiki in the browser. It combines a Go backend (using go-git for repository operations) with a React frontend (built with Vite) to provide an integrated browsing and editing experience.

## Project Structure

```
giki/
├── cmd/giki/              # CLI entry point
│   └── main.go            # Main executable
├── internal/              # Internal Go packages
│   ├── cli/               # CLI argument parsing and command execution
│   ├── server/            # HTTP server and API handlers
│   ├── git/               # Git repository operations (via go-git)
│   └── config/            # Configuration management
├── ui/                    # React frontend
│   ├── embed.go           # Go embed directive for frontend assets
│   ├── src/               # React source code (created in Step 3)
│   └── dist/              # Built frontend assets (gitignored)
├── e2e/                   # End-to-end tests with Playwright (created in Step 27)
├── Makefile               # Build and development targets
├── go.mod                 # Go module definition
└── architecture.md        # This file
```

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Language | Go |
| Frontend | React + TypeScript (Vite) |
| Markdown rendering | Client-side with react-markdown + remark-gfm + rehype-highlight |
| Git library | go-git (pure Go implementation) |
| Editor | CodeMirror 6 |
| Testing | Go testing + Vitest + Playwright |
| Build | embed.FS for frontend assets |

## Development Workflow

During development, two processes run concurrently:

1. **Frontend dev server**: Vite dev server on `localhost:5173` with HMR
2. **Go server**: Runs on `localhost:4242` with `GIKI_DEV=1`, proxies non-API requests to Vite

Vite's configuration proxies `/api` requests back to the Go server at `localhost:4242`.

For production builds, `make build` runs the frontend build first, then embeds the static assets into the Go binary using `embed.FS`.

## Key Architectural Decisions

1. **Embedded frontend**: The React app is built and embedded into the Go binary using `embed.FS`, producing a single distributable binary with no runtime dependencies.

2. **SPA routing**: The Go server serves `index.html` for all non-API routes, allowing React Router to handle client-side navigation.

3. **Working tree vs git objects**: The current/HEAD branch reads from the filesystem (showing uncommitted changes), while other branches read from the git object store (showing only committed state).

4. **Pending changes in browser state**: All edits are held in React context until explicit commit. This avoids server-side state management but means refreshing loses pending changes.

5. **Clone-first for remote repos**: Remote repositories are cloned to `~/.giki/repos/` before serving, rather than using platform APIs for browsing.

## Release Infrastructure

Giki uses GoReleaser with GitHub Actions for automated release management and distribution:

### Version Management
- **Version variables**: `internal/cli/version.go` defines `Version`, `Commit`, and `Date` variables (initialized to dev/none/unknown)
- **Build-time injection**: Makefile uses `-ldflags` to inject version info at build time
- **Version command**: `giki version` subcommand displays version, commit hash, and build date

### GoReleaser Configuration (`.goreleaser.yaml`)
- **Cross-platform builds**: macOS (arm64/amd64), Linux (arm64/amd64), Windows (amd64)
- **Frontend build hook**: Runs `make frontend-build` before Go builds to ensure ui/dist/ exists
- **Static binaries**: `CGO_ENABLED=0` for portability
- **Archives**: tar.gz for Unix, zip for Windows, includes LICENSE and README
- **Homebrew tap**: Auto-publishes formula to `buckleypaul/homebrew-tap` repository
- **Checksums and changelog**: Automatic generation for all releases

### GitHub Actions Workflows
- **Release workflow** (`.github/workflows/release.yml`):
  - Triggered on push of `v*` tags
  - Sets up Go 1.25 + Node.js 20
  - Runs GoReleaser to build cross-platform binaries
  - Creates GitHub release with binaries and checksums
  - Pushes Homebrew formula to tap repository
- **CI workflow** (`.github/workflows/ci.yml`):
  - Triggered on push to main and pull requests
  - Runs Go tests (`go test ./...`)
  - Builds frontend (`make frontend-build`)
  - Runs frontend tests (`cd ui && npm test`)
  - Builds binary (`make build`)
  - Verifies version command works

### Distribution Methods
1. **Homebrew**: `brew install buckleypaul/tap/giki` (official tap)
2. **Direct download**: Download platform-specific archives from GitHub releases
3. **From source**: `make build` (requires Go 1.25+ and Node.js 20+)

### Release Process
1. Create and push an annotated tag (e.g., `v0.1.0`)
2. GitHub Actions automatically:
   - Builds binaries for all platforms
   - Creates GitHub release with binaries and checksums
   - Pushes Homebrew formula to `buckleypaul/homebrew-tap`
3. Users can install via Homebrew or direct download

## Components

### Backend (Go)

- **CLI layer** (`internal/cli`): ✓ Implemented in Step 4
  - `root.go`: Cobra-based command with flags (--port, --branch), argument parsing, path/URL detection
  - Port availability checking, browser opening
  - Git repository validation before server start (Step 5)
- **Server layer** (`internal/server`): ✓ Implemented in Step 3
  - `server.go`: HTTP server setup, port binding, mux configuration
  - `spa.go`: SPA handler with embedded FS serving and dev mode proxy support
  - API handlers _(to be implemented in Phase 2)_
- **Git layer** (`internal/git`): ✓ Interface defined in Step 5, implementation in progress
  - `provider.go`: GitProvider interface with Tree, FileContent, Branches, Status methods
  - `local.go`: LocalProvider implementation for local repositories (validation complete)
  - Methods Tree/FileContent/Branches/Status to be implemented in Phase 2
- **Config layer** (`internal/config`): Configuration file and environment variable handling _(to be implemented in Step 25)_

### Frontend (React)

- **Basic scaffold**: ✓ Implemented in Step 3
  - Vite + React + TypeScript setup
  - Embedded via `embed.FS` in Go binary
  - Dev mode proxy support
  - Basic App component
- **Layout**: Three-zone layout (TopBar, Sidebar, ContentArea) _(to be implemented in Step 10)_
- **File tree**: Expandable/collapsible tree with directory-first sorting _(to be implemented in Step 11)_
- **Viewers**: Markdown rendering, code syntax highlighting, image display, binary file info _(to be implemented in Steps 12-13)_
- **Editor**: Split-pane CodeMirror with live preview _(to be implemented in Step 17)_
- **Pending changes**: In-memory tracking of creates/modifies/deletes/moves _(to be implemented in Step 16)_
- **Search**: Fuzzy filename search and full-text content search _(to be implemented in Step 22)_
- **Theme**: Light/dark mode with system preference detection _(to be implemented in Step 23)_

## Current Status

**Completed Steps:**
- Phase 1 (Foundation): Steps 1-5 ✓
- Phase 2 (Core API Endpoints): Steps 6-9 ✓
- Phase 3 (Read-Only UI): Steps 10-15 ✓
- Phase 5 (Distribution): Step 26 ✓ (implemented ahead of schedule)

**Current Capabilities (v0.1.0):**
- Browse local git repositories via web UI
- GitHub Flavored Markdown rendering with syntax highlighting
- Code file display with syntax highlighting (180+ languages)
- Image display
- Branch switching (dropdown selector)
- File tree navigation with collapsible directories
- URL routing and directory listings
- Cross-platform distribution via Homebrew tap

**Next Steps:**
- Phase 4 (Editing Features): Steps 16-21 (pending changes, editing, committing)
- Phase 5 (Distribution): Steps 24-25, 27 (remote repos, theming, search, e2e tests)

See `progress-log.md` for detailed implementation history.

## End-to-End Testing

Giki uses Playwright for browser-based end-to-end tests that verify the complete application stack.

### Test Infrastructure (e2e/)
- **Test runner**: Playwright with multi-browser support (Chromium, Firefox, WebKit)
- **Test server**: Playwright's webServer launches giki binary against test fixture on port 4243
- **Test fixture**: Realistic git repository with multiple branches, markdown files, code, images
- **Test coverage**: 11 test suites with 35+ tests covering all major features

### Test Suites
1. **Navigation**: Root page, sidebar navigation, browser history integration
2. **Markdown Rendering**: GFM tables, code blocks, syntax highlighting, relative links
3. **File Tree**: Directory sorting, expand/collapse, gitignore handling
4. **File Viewers**: Code viewer, image viewer, binary file handling
5. **Branch Switching**: Branch dropdown, tree updates, missing file redirects
6. **URL Routing**: Direct navigation, 404 handling, directory listings
7. **Editor**: CodeMirror integration, typing, pending changes indicator
8. **Commit**: Edit workflow, commit dialog, pending changes cleared after commit
9. **Search**: Filename search, content search, result navigation
10. **Theme**: Dark/light toggle, localStorage persistence
11. **Responsive**: Mobile viewport, sidebar collapse, content readability

### Running E2E Tests
```bash
cd e2e
npm test                   # Run all tests headless
npm run test:headed        # Run with browser UI
npm run test:ui            # Run with Playwright UI
npm run test:debug         # Run in debug mode
```

The tests require the giki binary to be built first (`make build` at project root).
