# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Giki is a Go CLI tool that turns any git repository into a browsable wiki in the browser. It combines a Go backend (using go-git) with a React frontend (built with Vite) embedded into a single distributable binary.

**Go module**: `github.com/buckleypaul/giki`

## Build & Development Commands

### Production Build
```bash
make build              # Build frontend + Go binary (single executable)
./giki .                # Run the binary on current directory
```

### Development Mode
Run two processes concurrently during development:

```bash
# Terminal 1: Frontend dev server (port 5173)
make frontend-dev       # or: cd ui && npm run dev

# Terminal 2: Go server with dev mode (port 4242)
make dev                # or: GIKI_DEV=1 go run ./cmd/giki .
```

In dev mode, the Go server proxies non-API requests to Vite's dev server. Vite proxies `/api/*` requests back to the Go server. This mirrors production behavior without requiring frontend rebuilds.

### Testing
```bash
make test               # Run all Go tests
cd ui && npm test       # Run frontend Vitest tests
```

### Clean Build Artifacts
```bash
make clean              # Remove giki binary, ui/dist/, ui/node_modules/
```

## CLI Usage

```bash
giki [path-or-url]           # Open a local repo or clone a remote one
giki .                       # Open current directory
giki /path/to/repo           # Open a specific local repo
giki https://github.com/o/r  # Clone and open a remote repo
giki version                 # Print version info
```

### Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--port` | `-p` | 4242 | Port to run the server on |
| `--branch` | `-b` | HEAD | Branch to browse |
| `--token` | `-t` | (none) | Personal access token (GitHub or GitLab) |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GIKI_DEV=1` | Enable dev mode (proxy to Vite dev server) |
| `GIKI_GITHUB_TOKEN` | GitHub personal access token |
| `GIKI_GITLAB_TOKEN` | GitLab personal access token |

**Token precedence**: CLI flag > config file > environment variable

### Configuration File

Located at `~/.config/giki/config.toml`:

```toml
github_token = "ghp_..."
gitlab_token = "glpat-..."
```

## Project Architecture

### Directory Structure
```
cmd/giki/               # CLI entry point
internal/cli/           # Cobra-based CLI (flags, args, validation)
internal/server/        # HTTP server + API handlers
internal/git/           # Git operations via go-git (GitProvider interface)
internal/config/        # Configuration (~/.config/giki/config.toml)
ui/                     # React + TypeScript frontend (Vite)
ui/embed.go             # Embeds ui/dist/ into Go binary
e2e/                    # Playwright end-to-end tests
```

### Key Architectural Decisions

1. **Embedded Frontend**: React app built to `ui/dist/`, embedded into Go binary via `embed.FS`. No runtime dependencies.

2. **SPA Routing**: Go server serves `index.html` for all non-`/api/*` routes. React Router handles client-side navigation.

3. **Working Tree vs Git Objects**: Current/HEAD branch reads from filesystem (uncommitted changes visible). Other branches read from git object store (committed state only).

4. **Pending Changes in Browser**: All edits held in React context until explicit commit. Refreshing loses pending changes (acceptable tradeoff to avoid server-side state).

5. **Clone-First for Remote Repos**: Remote repositories cloned to `~/.giki/repos/` before serving (API-based browsing deferred to later steps).

### API Endpoints

All backend endpoints under `/api/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/tree?branch=<branch>` | File tree (nested TreeNode JSON) |
| `GET /api/file/<path>?branch=<branch>` | Raw file content with Content-Type detection |
| `GET /api/branches` | List of branches (JSON array with isDefault flag) |
| `GET /api/status` | Repo metadata (source path, branch, isDirty flag) |
| `POST /api/write` | Write/create a file (body: `{path, content, branch}`) |
| `POST /api/delete` | Delete a file (body: `{path, branch}`) |
| `POST /api/move` | Move/rename a file (body: `{oldPath, newPath, branch}`) |
| `POST /api/move-folder` | Move/rename a folder and all contents |
| `POST /api/commit` | Commit pending changes (body: `{message, changes}`) |
| `GET /api/search?q=<query>&branch=<branch>` | Search files by name or content |
| `GET /api/themes` | List user-installed themes from `~/.config/giki/themes/` |

### Frontend Stack

- **React Router**: Client-side routing with URL-based navigation
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-slug`
- **Code Editor**: CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-markdown`)
- **Syntax Highlighting**: `highlight.js` with dynamic theme switching
- **State Management**: React contexts — `BranchContext`, `PendingChangesContext`, `ThemeContext`
- **Search**: `Cmd+K` / `Ctrl+K` opens search panel (filename + content search)
- **Themes**: Light/dark mode + user-installed highlight.js themes from `~/.config/giki/themes/`
- **Testing**: Vitest with `@testing-library/react`

### Go Backend Stack

- **CLI**: `github.com/spf13/cobra` for command parsing
- **Git**: `github.com/go-git/go-git/v5` for pure Go git operations
- **Testing**: Standard `testing` package with `httptest` for integration tests

## Step-Based Workflow

This project follows a granular step-by-step implementation plan (`plan.md`). Each step must be:

1. **Implemented** according to its "Do" section
2. **Tested** according to its "Test" section (Go tests + Vitest tests)
3. **Verified** against "Acceptance" criteria
4. **Committed** immediately with message: `"Step N: Brief description"`
5. **Logged** in `progress-log.md` with test results

**CRITICAL**: One step = one commit. Do not proceed to the next step until the current step is fully complete, tested, and committed. See `MEMORY.md` for the step workflow.

**Current Progress**: Check `progress-log.md` for the latest completed steps.

### Living Documents

- **`architecture.md`**: Update when architectural components change
- **`progress-log.md`**: Append summary after each step completion

## Common Patterns

### Adding a New API Endpoint

1. Define method in `internal/git/provider.go` interface
2. Implement in `internal/git/local.go` (with unit tests in `local_test.go`)
3. Create handler in `internal/server/handler_<name>.go` (with integration tests in `handler_<name>_test.go`)
4. Register in `internal/server/server.go` mux

### Adding a New Frontend Component

1. Create component in `ui/src/components/<Name>.tsx` with corresponding `.css` file
2. Create test file `ui/src/components/<Name>.test.tsx`
3. Support light/dark mode via CSS custom properties (`--bg-primary`, `--text-primary`, etc.)
4. Use TypeScript strict mode; define types in `ui/src/api/types.ts` if shared

### Path Handling

- **Go**: Use `filepath.Clean()` and validate paths to prevent traversal attacks
- **React**: Relative links in markdown → React Router `<Link>` (SPA nav); external links → `<a target="_blank">`
- **Images**: Relative images rewritten to `/api/file/<resolved-path>` endpoint

### Folder Operations

Users can rename/move folders via the edit button (✎) in the sidebar:
- Click edit next to a folder name
- Enter new path (can move to different parent directory)
- Creates a `move-folder` pending change
- On commit, executes `git mv` to move folder and all contents
- Validates against self-nesting and existing paths

## Testing Requirements

### Go Tests
- **Unit tests**: Test individual functions/methods in isolation
- **Integration tests**: Use `httptest.NewServer()` to test full request/response cycle
- All tests must pass before commit: `go test ./...`
- Use `testing.TempDir()` for temporary directories in tests

### Frontend Tests (Vitest)
- **Component tests**: Render components with mock data, verify DOM output
- **Integration tests**: Mock API calls with `vi.mock()`, verify component behavior
- All tests must pass before commit: `cd ui && npm test`
- Use `@testing-library/react` for user-centric testing

### End-to-End Tests (Playwright)
- Located in `e2e/tests/` with fixture repo at `e2e/fixtures/test-repo`
- Runs against a real Giki server on port 4243
- Multi-browser: Chromium, Firefox, WebKit
- Run with: `cd e2e && npx playwright test`

### Test Coverage Expectations
- New functions/methods should have unit tests covering success and error cases
- New API endpoints need integration tests verifying request/response
- New React components need tests for rendering, user interaction, and edge cases

## Release Process

Giki uses GoReleaser + GitHub Actions. Push an annotated tag to trigger a release:

```bash
git tag -a v0.X.Y -m "Release v0.X.Y: summary of changes"
git push origin v0.X.Y
```

This builds cross-platform binaries (Linux/macOS/Windows), creates a GitHub release, and updates the Homebrew tap (`buckleypaul/homebrew-tap`). Version info is injected via ldflags into `internal/cli/version.go`.

**Config files**: `.goreleaser.yaml`, `.github/workflows/release.yml`
**CI workflow**: `.github/workflows/ci.yml` (runs tests on push/PR)

## Git Workflow

- Commit after each completed step with format: `"Step N: Brief description"`
- Include co-author line: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
- Do not commit `.env` files, credentials, or large binaries
- Stage specific files by name rather than `git add .` when possible

## Important Files

- `plan.md`: Full 27-step implementation plan with dependencies
- `prd.md`: Product Requirements Document (detailed feature specs)
- `architecture.md`: High-level architecture and current status
- `progress-log.md`: Implementation history with test results
- `Makefile`: Build targets and common operations
