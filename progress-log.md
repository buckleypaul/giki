# Giki Implementation Progress Log

This document tracks the completion of each step in the Giki implementation plan (`plan.md`). Each entry includes the date, step number, summary of work done, and test results.

---

## Step 1: Project scaffold, Go module, Makefile
**Date:** 2026-02-13
**Phase:** Phase 1 - Foundation

**Summary:**
- Initialized Go module: `github.com/buckleypaul/giki`
- Created directory structure: `cmd/giki/`, `internal/{cli,server,git,config}/`, `ui/`
- Implemented minimal `cmd/giki/main.go` that prints "giki"
- Created `Makefile` with targets: `build`, `dev`, `test`, `clean`, `frontend-build`, `frontend-dev`
- Created `.gitignore` to exclude build artifacts and frontend dependencies
- Created `architecture.md` with initial project overview and directory structure
- Created `progress-log.md` (this file)

**Test Results:**
- ✓ `go build ./cmd/giki` succeeded
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` produced `giki` binary (2.5M)
- ✓ Binary runs and outputs "giki" as expected

**Next Step:** Step 2 - GitHub repository setup

---

## Step 2: GitHub repository setup
**Date:** 2026-02-13
**Phase:** Phase 1 - Foundation

**Summary:**
- Created GitHub repository `buckleypaul/giki` using `gh repo create`
- Added remote origin pointing to `git@github.com:buckleypaul/giki.git`
- Pushed initial scaffold to GitHub (main branch)
- Repository description: "A Go CLI tool that turns any git repository into a browsable wiki in the browser"

**Test Results:**
- ✓ `git remote -v` shows GitHub remote (fetch and push)
- ✓ `gh repo view` successfully displays repository information
- ✓ Initial commits pushed to GitHub main branch

**Next Step:** Step 3 - Vite + React scaffold with embed.FS wiring

---

## Step 3: Vite + React scaffold with embed.FS wiring
**Date:** 2026-02-13
**Phase:** Phase 1 - Foundation

**Summary:**
- Initialized Vite + React + TypeScript in `ui/` directory using `npm create vite@latest . -- --template react-ts`
- Configured `vite.config.ts` with proxy: `/api` -> `http://localhost:4242`
- Created `ui/embed.go` with `//go:embed dist` directive exposing `var Dist embed.FS`
- Created `internal/server/spa.go` — handler serving static files from embedded FS with SPA fallback to `index.html` for non-API paths
- Implemented dev mode support via `GIKI_DEV=1` env var that proxies requests to Vite dev server
- Created `internal/server/server.go` — HTTP server that creates `http.ServeMux`, mounts SPA handler, listens on port 4242
- Updated `cmd/giki/main.go` to start the HTTP server
- Updated `Makefile` targets: `frontend-build` runs `npm install && npm run build`, `frontend-dev` runs `npm run dev`

**Files Created:**
- `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/index.html`
- `ui/src/main.tsx`, `ui/src/App.tsx`
- `ui/embed.go`
- `internal/server/spa.go`
- `internal/server/server.go`

**Test Results:**
- ✓ `make frontend-build` produced `ui/dist/index.html` (449 bytes)
- ✓ `go build ./cmd/giki` succeeded with embedded assets (9.0M binary)
- ✓ Running binary + hitting `http://localhost:4242/` returned React app HTML
- ✓ Hitting `/nonexistent` returned `index.html` (SPA fallback working)
- ✓ Hitting `/api/anything` returned 404 (not falling through to SPA as expected)

**Next Step:** Step 4 - CLI with Cobra (flags, argument parsing, browser open)

---

## Step 4: CLI with Cobra (flags, argument parsing, browser open)
**Date:** 2026-02-13
**Phase:** Phase 1 - Foundation

**Summary:**
- Added `github.com/spf13/cobra` and `github.com/pkg/browser` dependencies
- Created `internal/cli/root.go` with root command `giki [path-or-url]`:
  - Accepts 0 or 1 positional arguments (defaults to `.`)
  - Flags: `--port`/`-p` (int, default 4242), `--branch`/`-b` (string)
  - Detects local path vs URL (heuristic: starts with `http://`, `https://`, `git@`)
  - Validates local path exists using `os.Stat()`
  - Checks port availability before starting server
  - Opens default browser to `http://localhost:<port>` after server starts
- Updated `cmd/giki/main.go` to call `cli.Execute()` instead of directly starting server
- Created `internal/cli/root_test.go` with comprehensive test coverage:
  - URL detection tests for HTTP, HTTPS, Git SSH, and local paths
  - Path resolution tests (`.` resolves to cwd, absolute/relative paths)
  - Port availability checking
  - Flag parsing (port and branch flags)
  - Argument validation

**Files Created:**
- `internal/cli/root.go`
- `internal/cli/root_test.go`

**Files Modified:**
- `cmd/giki/main.go`
- `go.mod`, `go.sum` (new dependencies)

**Test Results:**
- ✓ All tests in `internal/cli/root_test.go` passed (5 test functions, 14 subtests)
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.0M)
- ✓ `./giki --help` displays correct usage and flags
- ✓ `./giki /nonexistent` prints "Error: path does not exist: /nonexistent" and exits with code 1
- ✓ `./giki .` with port already in use prints "Error: port 4242 is already in use" and exits with code 1
- ✓ `./giki -p 9090 .` starts server on port 9090 successfully

**Acceptance Criteria (PRD 3.1):**
- ✅ `giki .` starts server on :4242, opens browser
- ✅ `giki -p 9090 .` starts on :9090
- ✅ `giki /nonexistent` prints error, exits non-zero
- ✅ Port in use prints "Error: port 4242 is already in use", exits non-zero

**Next Step:** Step 5 - Git provider interface + local repo validation

---

## Step 5: Git provider interface + local repo validation
**Date:** 2026-02-13
**Phase:** Phase 1 - Foundation

**Summary:**
- Created `internal/git/provider.go` — `GitProvider` interface with four methods (Tree, FileContent, Branches, Status)
- Defined types: `TreeNode`, `BranchInfo`, `RepoStatus` (used in future phases)
- Created `internal/git/local.go` — `LocalProvider` struct implementing validation:
  - `NewLocalProvider(path, branch)` opens repo with `go-git PlainOpen`, validates git repo
  - Resolves HEAD branch if no explicit branch provided
  - Returns proper error messages for non-git directories and nonexistent branches
  - Methods Tree/FileContent/Branches/Status are stubs (to be implemented in Phase 2)
- Wired CLI to create `LocalProvider` before starting server in `internal/cli/root.go`
- Added go-git v5.16.5 dependency to `go.mod`
- Created comprehensive test suite in `internal/git/local_test.go`:
  - Test opening giki repo itself
  - Test non-git directory error
  - Test nonexistent branch error
  - Test HEAD branch resolution
  - Test explicit branch specification

**Files Created:**
- `internal/git/provider.go`
- `internal/git/local.go`
- `internal/git/local_test.go`

**Files Modified:**
- `internal/cli/root.go` (added git validation before server start)
- `go.mod`, `go.sum` (added go-git and transitive dependencies)

**Test Results:**
- ✓ All tests in `internal/git/local_test.go` passed (5 test functions)
- ✓ All tests in `internal/cli/root_test.go` passed (14 subtests)
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.4M)
- ✓ `./giki .` in git repo starts successfully (validated)
- ✓ `./giki /tmp/not-a-git-repo` prints "Error: /tmp/not-a-git-repo is not a git repository"
- ✓ `./giki --branch nonexistent .` prints "Error: branch 'nonexistent' not found"
- ✓ `./giki /tmp/nonexistent` prints "Error: path does not exist: /tmp/nonexistent"

**Acceptance Criteria (PRD 3.1):**
- ✅ `giki .` inside git repo starts successfully
- ✅ `giki .` outside git repo prints error, exits non-zero
- ✅ `giki --branch nonexistent .` prints error, exits non-zero

**Next Step:** Step 6 - `/api/tree` endpoint

---

## Step 6: `/api/tree` endpoint
**Date:** 2026-02-13
**Phase:** Phase 2 - Core API Endpoints

**Summary:**
- Implemented `LocalProvider.Tree(branch)` method in `internal/git/local.go`
- Reads from working tree for current branch (includes uncommitted changes)
- Respects `.gitignore` rules using go-git's gitignore matcher
- Builds nested `TreeNode` tree structure with proper sorting (directories first, then files, case-insensitive alphabetical)
- Combines tracked and untracked non-ignored files using `worktree.Status()` and `filepath.Walk()`
- Created `internal/server/handler_tree.go` with `GET /api/tree?branch=<branch>` endpoint returning JSON
- Comprehensive test coverage in `internal/git/local_test.go` and `internal/server/handler_tree_test.go`

**Files Created:**
- `internal/server/handler_tree.go`
- `internal/server/handler_tree_test.go`

**Files Modified:**
- `internal/git/local.go` (implemented Tree method and helper functions)
- `internal/server/server.go` (wired handler into mux)

**Test Results:**
- ✓ All unit tests in `internal/git/local_test.go` passed (11 test functions covering tree structure, .gitignore, dotfiles, sorting)
- ✓ All integration tests in `internal/server/handler_tree_test.go` passed (3 test functions)
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.4M)
- ✓ Manual testing: `GET /api/tree` returns correct JSON tree structure

**Acceptance Criteria (PRD 3.3):**
- ✅ Tree matches `git ls-files` + untracked non-ignored files
- ✅ Directories listed above files in sorted order
- ✅ `.gitignore`d files excluded from tree
- ✅ Tracked dotfiles (like `.github/`) included

**Next Step:** Step 7 - `/api/file/<path>` endpoint

---

## Step 7: `/api/file/<path>` endpoint
**Date:** 2026-02-13
**Phase:** Phase 2 - Core API Endpoints

**Summary:**
- Implemented `LocalProvider.FileContent(path, branch)` method in `internal/git/local.go`
- Reads raw file bytes from working tree for current branch
- Includes path normalization, validation, and security checks (blocks `..` path traversal)
- Returns proper errors for nonexistent files, directories, and invalid paths
- Created `internal/server/handler_file.go` with `GET /api/file/<path>?branch=<branch>` endpoint
- Automatically detects Content-Type using `mime.TypeByExtension()` with fallback to `http.DetectContentType()`
- Returns 404 JSON response for missing files with proper error message
- Created comprehensive unit tests in `internal/git/local_test.go` (5 new test functions)
- Created integration tests in `internal/server/handler_file_test.go` (7 test functions covering various file types and error cases)

**Files Created:**
- `internal/server/handler_file.go`
- `internal/server/handler_file_test.go`

**Files Modified:**
- `internal/git/local.go` (implemented FileContent method)
- `internal/server/server.go` (wired handler into mux)
- `internal/git/local_test.go` (added 5 unit tests for FileContent)

**Test Results:**
- ✓ All unit tests passed (16 test functions in `internal/git/local_test.go`)
- ✓ All integration tests passed (7 test functions in `internal/server/handler_file_test.go`)
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.4M)
- ✓ Manual testing:
  - `GET /api/file/plan.md` returns markdown content with correct Content-Type
  - `GET /api/file/nonexistent.md` returns 404 JSON: `{"error":"file not found"}`
  - `GET /api/file/cmd/giki/main.go` returns Go source code with correct Content-Type

**Unit Tests:**
- ✓ Read known file, verify contents
- ✓ Read nonexistent file, verify error
- ✓ Attempt to read directory, verify error
- ✓ Path traversal attacks blocked (e.g., `../../../etc/passwd`)
- ✓ Nested file paths work correctly with forward slashes

**Integration Tests:**
- ✓ `GET /api/file/README.md` returns markdown text
- ✓ `GET /api/file/nonexistent` returns 404 JSON
- ✓ `.go` files return with text content-type
- ✓ `.png` files return with image/png content-type
- ✓ Nested paths work correctly
- ✓ Directory requests return 404

**Acceptance Criteria:**
- ✅ Markdown files (`.md`) return with correct Content-Type
- ✅ Go source files (`.go`) return with text Content-Type
- ✅ Binary files (`.png`) return with correct image Content-Type
- ✅ Nonexistent files return 404 JSON response
- ✅ Security: Path traversal attempts are blocked

**Next Step:** Step 8 - `/api/branches` endpoint

---

