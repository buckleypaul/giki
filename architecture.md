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
- Step 1: Project scaffold, Go module, Makefile ✓
- Step 2: GitHub repository setup ✓
- Step 3: Vite + React scaffold with embed.FS wiring ✓
- Step 4: CLI with Cobra (flags, argument parsing, browser open) ✓
- Step 5: Git provider interface + local repo validation ✓

**Next Step:**
- Step 6: `/api/tree` endpoint (Phase 2: Core API Endpoints)

See `progress-log.md` for detailed implementation history.
