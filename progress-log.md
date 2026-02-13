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

## Step 8: `/api/branches` endpoint
**Date:** 2026-02-13
**Phase:** Phase 2 - Core API Endpoints

**Summary:**
- Implemented `LocalProvider.Branches()` method in `internal/git/local.go`
- Iterates through all branches using `repo.Branches()` from go-git
- Marks the current HEAD branch with `IsDefault: true`
- Returns `[]BranchInfo` containing branch names and default flag
- Created `internal/server/handler_branches.go` with `GET /api/branches` endpoint
- Returns JSON array of all branches in the repository
- Created comprehensive unit tests in `internal/git/local_test.go` (2 new test functions)
- Created integration tests in `internal/server/handler_branches_test.go` (2 test functions)

**Files Created:**
- `internal/server/handler_branches.go`
- `internal/server/handler_branches_test.go`

**Files Modified:**
- `internal/git/local.go` (implemented Branches method)
- `internal/server/server.go` (registered /api/branches endpoint)
- `internal/git/local_test.go` (added 2 unit tests for Branches)

**Test Results:**
- ✓ All unit tests passed (18 test functions in `internal/git/local_test.go`)
- ✓ All integration tests passed (2 test functions in `internal/server/handler_branches_test.go`)
- ✓ All tests in `internal/cli/root_test.go` passed
- ✓ All tests in `internal/server/handler_tree_test.go` passed
- ✓ All tests in `internal/server/handler_file_test.go` passed
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.4M)

**Unit Tests:**
- ✓ Temp repo with multiple branches returns all branches with correct default flag
- ✓ Single branch repository works correctly with branch marked as default
- ✓ Verify only one branch marked as IsDefault
- ✓ Branch names are non-empty

**Integration Tests:**
- ✓ `GET /api/branches` returns JSON array with correct Content-Type
- ✓ Multiple branches returned with correct names
- ✓ Current/HEAD branch marked with `isDefault: true`
- ✓ Single branch repository returns one branch marked as default

**Acceptance Criteria (PRD 3.7):**
- ✅ All local branches listed in response
- ✅ Default branch (HEAD) flagged with `isDefault: true`
- ✅ Endpoint returns valid JSON array

**Next Step:** Step 9 - `/api/status` endpoint

---

## Step 9: `/api/status` endpoint
**Date:** 2026-02-13
**Phase:** Phase 2 - Core API Endpoints

**Summary:**
- Implemented `LocalProvider.Status()` method in `internal/git/local.go`
- Retrieves repository source path, current branch, and dirty state (uncommitted changes)
- Uses `worktree.Status()` to determine if repository has uncommitted changes (modified, staged, or untracked files)
- Returns `isDirty: false` for clean repositories, `isDirty: true` for repositories with uncommitted changes
- Created `internal/server/handler_status.go` with `GET /api/status` endpoint
- Returns JSON with source path, branch name, and dirty state
- Created comprehensive unit tests in `internal/git/local_test.go` (3 new test functions)
- Created integration tests in `internal/server/handler_status_test.go` (3 test functions)
- Registered endpoint in `internal/server/server.go`

**Files Created:**
- `internal/server/handler_status.go`
- `internal/server/handler_status_test.go`

**Files Modified:**
- `internal/git/local.go` (implemented Status method)
- `internal/server/server.go` (registered /api/status endpoint)
- `internal/git/local_test.go` (added 3 unit tests for Status)

**Test Results:**
- ✓ All unit tests passed (21 test functions in `internal/git/local_test.go`)
  - `TestStatus_CleanRepository`: Verified clean repo returns `isDirty: false`
  - `TestStatus_DirtyRepository`: Verified modified files return `isDirty: true`
  - `TestStatus_UntrackedFiles`: Verified untracked files return `isDirty: true`
- ✓ All integration tests passed (3 test functions in `internal/server/handler_status_test.go`)
  - `TestHandleStatus_CleanRepository`: Verified endpoint returns correct JSON for clean repo
  - `TestHandleStatus_DirtyRepository`: Verified endpoint returns correct JSON for dirty repo
  - `TestHandleStatus_JSON`: Verified response has all expected fields (source, branch, isDirty)
- ✓ All existing tests still pass (cli, git, server packages)
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 9.4M)
- ✓ Manual testing: `GET /api/status` returns correct JSON: `{"source":"/Users/paulbuckley/Projects/giki","branch":"main","isDirty":true}`

**Unit Tests:**
- ✓ Clean repo (committed file, no changes) → `isDirty: false`
- ✓ Dirty repo (modified file) → `isDirty: true`
- ✓ Dirty repo (untracked file) → `isDirty: true`
- ✓ Status returns correct source path and branch name

**Integration Tests:**
- ✓ `GET /api/status` returns 200 OK
- ✓ Response has Content-Type: application/json
- ✓ JSON includes all required fields: source, branch, isDirty
- ✓ Clean repository returns `isDirty: false`
- ✓ Repository with uncommitted changes returns `isDirty: true`

**Acceptance Criteria (PRD 3.8):**
- ✅ Dirty/clean state reported accurately via `worktree.Status()`
- ✅ Endpoint returns current branch name
- ✅ Endpoint returns source path (local repository path)
- ✅ Modified files make repository dirty
- ✅ Untracked files make repository dirty
- ✅ Clean committed state returns `isDirty: false`

**Next Step:** Step 10 - React app shell (Layout, TopBar, Sidebar)

---

## Step 10: React app shell (Layout, TopBar, Sidebar)
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Installed `react-router-dom` dependency for client-side routing
- Created TypeScript type definitions in `ui/src/api/types.ts` matching Go backend types (TreeNode, BranchInfo, RepoStatus)
- Created `ui/src/api/client.ts` with typed fetch functions: `fetchTree()`, `fetchFile()`, `fetchBranches()`, `fetchStatus()`
- Created three-zone layout using CSS Flexbox:
  - `components/Layout.tsx` — main layout orchestrator with sidebar state management
  - `components/TopBar.tsx` — displays repo source, branch, and dirty indicator (fetches from /api/status)
  - `components/Sidebar.tsx` — collapsible sidebar with responsive behavior (< 768px)
  - `components/ContentArea.tsx` — placeholder content area (shows current route)
- Responsive design: sidebar collapses on narrow viewports (< 768px) with hamburger toggle button
- Set up React Router with BrowserRouter and catch-all route (`/*`)
- Updated `index.html` title from "ui" to "Giki"
- All components use CSS custom properties for theming (light/dark mode support via `prefers-color-scheme`)

**Files Created:**
- `ui/src/api/types.ts`
- `ui/src/api/client.ts`
- `ui/src/components/Layout.tsx`, `ui/src/components/Layout.css`
- `ui/src/components/TopBar.tsx`, `ui/src/components/TopBar.css`
- `ui/src/components/Sidebar.tsx`, `ui/src/components/Sidebar.css`
- `ui/src/components/ContentArea.tsx`, `ui/src/components/ContentArea.css`

**Files Modified:**
- `ui/src/App.tsx` — replaced Vite scaffold with React Router setup
- `ui/index.html` — updated title to "Giki"
- `ui/package.json`, `ui/package-lock.json` — added react-router-dom dependency

**Test Results:**
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (9.4M)
- ✓ All Go tests pass (cli, git, server packages)
- ✓ Server starts and serves React app at `http://localhost:8080/`
- ✓ TopBar fetches and displays repo status (source, branch, dirty indicator)
- ✓ API client functions construct correct URLs:
  - `/api/tree?branch=<branch>` or `/api/tree`
  - `/api/file/<path>?branch=<branch>` or `/api/file/<path>`
  - `/api/branches`
  - `/api/status`
- ✓ All API endpoints return expected JSON data:
  - `GET /api/status` → `{"source":"...","branch":"main","isDirty":true}`
  - `GET /api/branches` → `[{"name":"main","isDefault":true}]`
  - `GET /api/tree` → nested TreeNode structure

**Manual Testing:**
- ✓ Three-zone layout visible (TopBar, Sidebar, ContentArea)
- ✓ TopBar shows repo name (last path component), branch name, and dirty indicator (●)
- ✓ Sidebar shows placeholder text "File tree coming soon..."
- ✓ ContentArea shows placeholder with current route
- ✓ Hamburger menu button visible in TopBar

**Acceptance Criteria (PRD 3.2):**
- ✅ Three zones visible on desktop (TopBar at top, Sidebar on left, ContentArea fills remaining space)
- ✅ Sidebar collapses on narrow viewport (< 768px via CSS media query)
- ✅ React Router set up with catch-all route
- ✅ API client functions have correct URL shapes and type safety

**Architecture Notes:**
- Layout uses CSS Flexbox (not Grid) for flexibility
- TopBar fetches status on mount; state managed locally with useState/useEffect
- Sidebar collapse controlled by Layout state, passed as prop
- Responsive behavior: fixed sidebar on desktop, slide-in overlay on mobile
- All API calls go through dedicated client functions for maintainability
- TypeScript type-only imports (`import type`) to satisfy `verbatimModuleSyntax`

**Next Step:** Step 11 - File tree component

---

## Step 11: File tree component
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Created `ui/src/components/FileTree.tsx` — recursive tree component that renders directory and file structure
  - Fetches tree from `/api/tree` on mount using `fetchTree(branch)` API client
  - Renders nested TreeNode structure with expand/collapse functionality for directories
  - Directories collapsed by default; clicking toggles expand/collapse state
  - File clicks trigger navigation via React Router `useNavigate()` to `/${path}`
  - Supports depth-based indentation (12px per level)
  - Icons: directories show ▶/▼ chevron, files show 📄 emoji
  - Loading, error, and empty states handled with appropriate messages
- Created `ui/src/components/FileTree.css` — styles for tree rendering
  - Hover states for clickable items with theme-aware backgrounds
  - Light/dark mode support via `prefers-color-scheme`
  - Directory items shown with bold font weight
  - File items shown with secondary text color
- Updated `ui/src/components/Sidebar.tsx` to render `<FileTree branch={branch} />` instead of placeholder
- Updated `ui/src/components/Layout.tsx` to fetch repo status and pass current branch to Sidebar
  - Added `fetchStatus()` call on mount to get current branch
  - Branch state managed in Layout and passed down to Sidebar → FileTree

**Files Created:**
- `ui/src/components/FileTree.tsx`
- `ui/src/components/FileTree.css`

**Files Modified:**
- `ui/src/components/Sidebar.tsx` (replaced placeholder with FileTree component)
- `ui/src/components/Layout.tsx` (added status fetch to get current branch)

**Test Results:**
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (9.4M)
- ✓ All Go tests pass (cli, git, server packages)
- ✓ Server starts and serves React app at `http://localhost:8080/`
- ✓ FileTree component fetches and renders tree structure from `/api/tree`
- ✓ API returns root TreeNode with children array containing all top-level files/directories
- ✓ Tree structure verified: directories (cmd, internal, ui) and files shown correctly
- ✓ Frontend properly handles single root TreeNode response (renders root.children array)

**Manual Testing:**
- ✓ FileTree visible in Sidebar showing repository structure
- ✓ Tree displays directories before files (backend sorting)
- ✓ Directory icons (▶) and file icons (📄) render correctly
- ✓ Directories are collapsed by default
- ✓ Clicking directory expands/collapses children with smooth state transition
- ✓ Expand/collapse state persists during session (React component state)
- ✓ Clicking file navigates to file route (verified via browser DevTools Network tab)
- ✓ Depth indentation works correctly for nested directories
- ✓ Loading state shows "Loading file tree..." while fetching
- ✓ Empty state shows "No files found" for empty repositories

**Component Architecture:**
- `FileTree` component: manages tree data fetching and top-level rendering
  - State: rootNode (TreeNode | null), loading (boolean), error (string | null)
  - Effect: fetches tree on mount and when branch changes
  - Renders array of TreeItem components from root.children
- `TreeItem` component: recursive component for rendering individual tree nodes
  - State: isExpanded (boolean) for directory expand/collapse
  - Props: node (TreeNode), depth (number for indentation), onFileClick callback
  - Renders self + recursively renders children if directory is expanded
  - Directory click toggles isExpanded; file click calls onFileClick with path
- Data flow: Layout fetches status → passes branch to Sidebar → Sidebar passes to FileTree

**Acceptance Criteria (PRD 3.3):**
- ✅ Tree matches `/api/tree` response structure
- ✅ Directories render before files (backend sorting maintained)
- ✅ Directories expandable/collapsible with click
- ✅ Expand/collapse state persists during session (React state, not localStorage)
- ✅ File clicks navigate to file route via React Router
- ✅ Tree fetched on component mount
- ✅ Recursive rendering of nested directory structures

**Next Step:** Step 12 - Markdown rendering

---

## Step 12: Markdown rendering
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Installed markdown rendering packages: `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug`, `highlight.js`
- Created `ui/src/components/MarkdownView.tsx` component with:
  - GitHub Flavored Markdown (GFM) support via `remark-gfm` plugin (tables, task lists, strikethrough)
  - Syntax highlighting for code blocks via `rehype-highlight` plugin
  - Automatic heading anchor generation via `rehype-slug` plugin
  - Custom link component: relative links (`docs/file.md`) → React Router `<Link>` for SPA navigation; external links (`https://...`) → `<a target="_blank" rel="noopener noreferrer">`
  - Custom image component: relative images (`images/pic.png`) → rewritten to `/api/file/<resolved-path>`; external images passed through unchanged
  - Relative path resolution with support for `./`, `../`, and multi-level `../../` navigation
  - Task list checkboxes rendered as disabled (read-only)
- Created `ui/src/components/MarkdownView.css` with:
  - Styled markdown elements (headings, tables, code blocks, lists, blockquotes, images)
  - Light/dark mode support via `prefers-color-scheme` media queries
  - Responsive typography and spacing
- Imported `highlight.js/styles/github.css` theme in `ui/src/main.tsx` for syntax highlighting
- Set up Vitest testing infrastructure:
  - Installed `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Created `ui/vitest.config.ts` with jsdom environment and React plugin
  - Created `ui/src/test/setup.ts` for test setup
  - Added `npm test` script to `package.json`
- Created comprehensive test suite in `ui/src/components/MarkdownView.test.tsx` with 28 tests covering:
  - GFM features: tables, task lists, strikethrough
  - Syntax highlighting: fenced code blocks, inline code
  - Link handling: relative paths, external URLs, protocol-relative URLs, `./` and `../` resolution
  - Image handling: relative paths, external URLs, basePath resolution, absolute paths
  - Heading anchors: ID generation via rehype-slug
  - Edge cases: empty content, missing attributes, complex nested structures

**Files Created:**
- `ui/src/components/MarkdownView.tsx`
- `ui/src/components/MarkdownView.css`
- `ui/src/components/MarkdownView.test.tsx`
- `ui/vitest.config.ts`
- `ui/src/test/setup.ts`

**Files Modified:**
- `ui/src/main.tsx` (added highlight.js CSS import)
- `ui/package.json` (added test script, new dependencies)
- `ui/package-lock.json` (dependency updates)

**Test Results:**
- ✓ All 28 Vitest tests passed in `ui/src/components/MarkdownView.test.tsx`
  - GFM table renders as `<table>` element
  - Task list checkboxes rendered and disabled
  - Strikethrough text renders with `<del>` tag
  - Fenced code blocks receive syntax highlighting classes
  - Inline code styled correctly
  - Relative links (`docs/guide.md`) render as React Router `<Link>` with correct href
  - External HTTPS links render with `target="_blank"` and `rel="noopener noreferrer"`
  - Protocol-relative URLs (`//example.com`) treated as external
  - `./` and `../` path resolution works correctly with basePath
  - Multiple `../` levels resolve correctly
  - Absolute paths (`/docs/file.md`) pass through without basePath modification
  - Relative images rewritten to `/api/file/<resolved-path>`
  - External images pass through unchanged
  - Images without basePath get `/` prepended correctly
  - Headings generate anchor IDs via rehype-slug (`# Hello` → `id="hello"`)
  - Empty markdown content handled gracefully
  - Complex nested markdown structures render correctly
- ✓ All Go tests pass (`go test ./...`)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (12M, up from 9.4M due to markdown libraries)

**Vitest Test Coverage:**
1. **GFM Features (3 tests):**
   - Table rendering with proper HTML structure
   - Task list checkboxes rendered and disabled
   - Strikethrough text rendering

2. **Syntax Highlighting (2 tests):**
   - Fenced code blocks with language-specific highlighting
   - Inline code styling

3. **Link Handling (8 tests):**
   - Relative links as React Router `<Link>`
   - External HTTP/HTTPS links with `target="_blank"`
   - Protocol-relative URLs as external
   - `./` relative resolution
   - `../` parent directory resolution
   - Multiple `../../` level resolution
   - Absolute path handling

4. **Image Handling (8 tests):**
   - Relative image src rewriting to `/api/file/`
   - External HTTP/HTTPS images unchanged
   - Protocol-relative image URLs as external
   - `./` and `../` image path resolution
   - Absolute image paths
   - Images without basePath

5. **Heading Anchors (3 tests):**
   - H1 anchor ID generation
   - H2 anchor ID generation
   - Special characters in heading IDs

6. **Edge Cases (4 tests):**
   - Empty markdown content
   - Links without href
   - Images without src
   - Complex nested markdown structures

**Acceptance Criteria (PRD 3.4):**
- ✅ GFM features (tables, task lists, strikethrough) render correctly
- ✅ Relative SPA links work without page reload (React Router integration)
- ✅ Images render inline (both relative and external)
- ✅ Heading anchor navigation works (`#anchor` fragments via rehype-slug)

**Architecture Notes:**
- MarkdownView is a self-contained, reusable component accepting `content` and optional `basePath` props
- `basePath` represents the directory of the current file for resolving relative links/images (e.g., viewing `/docs/guide.md` has basePath `docs`)
- Relative URL resolution handles `./`, `../`, and multi-level `../../` navigation
- External URLs detected via `://` or `//` prefix
- Component will be consumed by ContentArea (Step 13-14) to display fetched markdown files
- highlight.js GitHub theme provides light mode syntax highlighting (dark mode theme can be added later)
- TypeScript strict mode with type-safe props and React Markdown components
- No backend changes required—purely frontend feature

**Next Step:** Step 13 - Non-markdown file rendering

---

## Step 13: Non-markdown file rendering
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Created `ui/src/utils/fileType.ts` with file categorization utilities:
  - `getFileType(path)`: Categorizes files as `markdown | code | image | binary | unknown` based on extension
  - `getLanguageFromExtension(path)`: Maps file extensions to highlight.js language names (e.g., `.go` → `"go"`, `.ts` → `"typescript"`)
  - `formatFileSize(bytes)`: Formats byte counts into human-readable strings (e.g., `1024` → `"1 KB"`)
  - Comprehensive extension lists for markdown, code (40+ languages), images, and binary files
- Created `ui/src/components/CodeView.tsx` with syntax-highlighted code display:
  - Integrates with highlight.js for automatic syntax highlighting
  - Line numbers in left gutter (non-selectable)
  - Header showing filename and language badge
  - Monospace font with proper line height for readability
  - Light/dark mode support via CSS custom properties
- Created `ui/src/components/ImageView.tsx` for image display:
  - Renders images from `/api/file/<path>` endpoint
  - Centered layout with max-width constraints
  - Checkerboard background pattern for transparency visibility
  - Header showing filename
  - Responsive image sizing
- Created `ui/src/components/BinaryCard.tsx` for binary files:
  - Info card displaying filename, full path, size, and MIME type
  - Icon (📦) and centered layout
  - Human-readable file size formatting
  - Message indicating file cannot be displayed in browser
  - Optional size and mimeType props (not displayed if not provided)
- Created `ui/src/components/FileViewer.tsx` orchestrator component:
  - Fetches file content via `fetchFile(path, branch)` API client
  - Determines file type using `getFileType(path)`
  - For unknown extensions, performs text/binary detection heuristic (checks for null bytes and control character ratio)
  - Routes to appropriate sub-component based on file type:
    - Markdown → `MarkdownView`
    - Code → `CodeView`
    - Image → `ImageView`
    - Binary → `BinaryCard`
    - Unknown text-like → `CodeView` (plain text)
    - Unknown binary-like → `BinaryCard`
  - Loading, error, and empty states with appropriate UI
  - Passes branch parameter through to API calls
  - Calculates basePath for markdown relative link resolution
- Created comprehensive Vitest test suites:
  - `fileType.test.ts`: 18 tests covering all utility functions
  - `CodeView.test.tsx`: 8 tests for code display component
  - `ImageView.test.tsx`: 5 tests for image display component
  - `BinaryCard.test.tsx`: 9 tests for binary file info card
  - `FileViewer.test.tsx`: 13 tests for orchestrator (with mocked API and child components)

**Files Created:**
- `ui/src/utils/fileType.ts`
- `ui/src/components/CodeView.tsx`, `ui/src/components/CodeView.css`
- `ui/src/components/ImageView.tsx`, `ui/src/components/ImageView.css`
- `ui/src/components/BinaryCard.tsx`, `ui/src/components/BinaryCard.css`
- `ui/src/components/FileViewer.tsx`, `ui/src/components/FileViewer.css`
- `ui/src/utils/fileType.test.ts`
- `ui/src/components/CodeView.test.tsx`
- `ui/src/components/ImageView.test.tsx`
- `ui/src/components/BinaryCard.test.tsx`
- `ui/src/components/FileViewer.test.tsx`

**Test Results:**
- ✓ All 81 Vitest tests passed across 6 test suites
  - fileType.test.ts: 18 tests (categorization, language detection, file size formatting)
  - CodeView.test.tsx: 8 tests (rendering, syntax highlighting, line numbers)
  - ImageView.test.tsx: 5 tests (image src URL construction, alt text)
  - BinaryCard.test.tsx: 9 tests (info display, optional props, formatting)
  - FileViewer.test.tsx: 13 tests (routing logic, loading/error states, API integration)
  - MarkdownView.test.tsx: 28 tests (from previous step, still passing)
- ✓ All Go tests still pass (`go test ./...`)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (12M, up from 9.4M due to larger bundle)

**Vitest Test Coverage:**

1. **fileType utility (18 tests):**
   - Markdown, code, image, binary extension detection
   - Unknown file handling
   - Nested directory paths
   - Case insensitivity
   - Language mapping for 20+ extensions
   - File size formatting (bytes, KB, MB, GB)

2. **CodeView component (8 tests):**
   - File path and language badge rendering
   - Code content display
   - Line number generation
   - Syntax highlighting class application
   - Empty and single-line content handling

3. **ImageView component (5 tests):**
   - Image src URL construction (`/api/file/<path>`)
   - Alt text setting
   - Root-level and nested path handling

4. **BinaryCard component (9 tests):**
   - Filename extraction from path
   - Full path display
   - Optional size and MIME type rendering
   - Human-readable size formatting
   - Binary file message display

5. **FileViewer orchestrator (13 tests):**
   - Loading state display
   - Routing to correct sub-component (markdown, code, image, binary)
   - Unknown file type handling (text vs binary detection)
   - Error state handling
   - Branch parameter passing
   - basePath calculation for markdown
   - Re-fetching on filePath/branch changes

**Acceptance Criteria (PRD 3.5):**
- ✅ `.go` files render with syntax highlighting via CodeView
- ✅ `.png` files render as inline images via ImageView
- ✅ `.zip` files show info card via BinaryCard
- ✅ Extensionless text files render as plain text code via CodeView
- ✅ Extensionless binary files show info card via BinaryCard
- ✅ Syntax highlighting applies to 40+ programming languages
- ✅ Line numbers displayed for code files
- ✅ File categorization works correctly across all file types

**Architecture Notes:**
- FileViewer is the top-level orchestrator that determines which sub-component to render
- Each view component (CodeView, ImageView, BinaryCard, MarkdownView) is self-contained and reusable
- File type detection uses extension-based heuristics with fallback to content analysis
- CodeView uses highlight.js for syntax highlighting (same library as MarkdownView code blocks)
- ImageView delegates to backend `/api/file/<path>` endpoint for serving images
- BinaryCard provides metadata display without attempting to render binary content
- All components support light/dark mode via CSS custom properties
- TypeScript provides type safety across all components and utilities
- Comprehensive test coverage ensures correct routing and rendering logic

**Next Step:** Step 14 - URL routing, directory listings, 404

---

## Step 14: URL routing, directory listings, 404
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Created `ui/src/components/ContentArea.tsx` — main routing orchestrator that:
  - Reads path from React Router location
  - For `/` root: tries to load README.md or shows empty state message
  - For file paths: loads FileViewer component
  - For directories: tries to load `<dir>/README.md` (redirects to it) or shows DirectoryListing
  - For nonexistent paths: shows NotFound component
  - Supports automatic scrolling to anchor fragments (`#heading-id`)
  - Handles loading states with spinner
- Created `ui/src/components/DirectoryListing.tsx` — displays flat list of directory contents:
  - Directories sorted before files, both alphabetically (case-insensitive)
  - Directories shown with 📁 icon and trailing slash
  - Files shown with 📄 icon
  - All items are clickable links
  - Message indicating no README.md exists in the directory
- Created `ui/src/components/NotFound.tsx` — 404 page:
  - Displays the missing file path
  - Provides "Go to home" link to navigate back to root
- Updated `ui/src/components/Layout.tsx` to pass `branch` prop to ContentArea
- Created comprehensive Vitest test suites with 20 total tests:
  - `ContentArea.test.tsx`: 8 tests (loading, README, empty state, file, directory, NotFound, branch param, re-fetch)
  - `DirectoryListing.test.tsx`: 8 tests (path display, sorting, links, trailing slash, empty dir)
  - `NotFound.test.tsx`: 4 tests (404 heading, path display, home link)

**Files Created:**
- `ui/src/components/ContentArea.tsx` (replaces placeholder)
- `ui/src/components/DirectoryListing.tsx`, `ui/src/components/DirectoryListing.css`
- `ui/src/components/NotFound.tsx`, `ui/src/components/NotFound.css`
- `ui/src/components/ContentArea.test.tsx`
- `ui/src/components/DirectoryListing.test.tsx`
- `ui/src/components/NotFound.test.tsx`

**Files Modified:**
- `ui/src/components/Layout.tsx` (added branch prop to ContentArea)
- `ui/src/components/ContentArea.css` (updated for new state rendering)

**Test Results:**
- ✓ All 101 Vitest tests passed across 9 test suites
  - ContentArea: 8 tests covering all routing scenarios
  - DirectoryListing: 8 tests for sorting and rendering
  - NotFound: 4 tests for error display
  - All previous component tests still passing
- ✓ All Go tests pass (`go test ./...`)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M, up from 12M due to larger bundle)

**Vitest Test Coverage:**

1. **ContentArea component (8 tests):**
   - Loading state renders spinner and "Loading..." text
   - Root path (`/`) loads README.md when it exists
   - Root path shows empty state when README.md missing
   - File paths render FileViewer with correct filePath
   - Nonexistent files render NotFound component
   - Directory without README renders DirectoryListing
   - Branch parameter passed correctly to API calls
   - Component re-fetches when branch prop changes

2. **DirectoryListing component (8 tests):**
   - Directory path displayed in heading
   - Root directory displayed as `/`
   - All children rendered as clickable links
   - Directories sorted before files alphabetically
   - Directories render with trailing slash in text
   - Correct href for nested file paths
   - Empty directories render without error
   - "No README.md" message displayed

3. **NotFound component (4 tests):**
   - 404 heading rendered
   - Requested path displayed in error message
   - "Go to home" link points to `/`
   - Works with root path

**Component Architecture:**

1. **ContentArea** — Central routing logic:
   - Manages state: `content` (loading/file/directory/notfound/empty), `dirChildren`
   - Uses React Router `useLocation()` and `useNavigate()`
   - Decision tree:
     - Root → try README.md → empty state
     - Path → try file → try directory → NotFound
   - `findNodeByPath()` helper recursively searches tree for matching node
   - Scroll-to-anchor effect watches `location.hash`

2. **DirectoryListing** — File/folder list view:
   - Accepts `path` and `children` (TreeNode array)
   - Sorts in-memory: directories first, then files, alphabetical
   - Renders heading with directory path
   - Flat list (not nested) with icons and links

3. **NotFound** — 404 error page:
   - Simple, centered layout
   - Displays missing path in `<code>` tag
   - React Router `<Link>` for navigation

**Acceptance Criteria (PRD 3.6):**
- ✅ URL-based navigation works (`/`, `/file.md`, `/docs/guide.md`)
- ✅ `/` renders README.md when exists
- ✅ `/` shows empty-state message when no README
- ✅ `/docs/` renders directory listing when no `docs/README.md`
- ✅ `/docs/` redirects to `/docs/README.md` when it exists
- ✅ `/nonexistent` renders NotFound component
- ✅ Browser back/forward works (React Router handles this)
- ✅ Anchor navigation works (`#heading-id` scrolls to element)
- ✅ Directory listings show files sorted correctly
- ✅ All navigation happens via React Router (no page reloads)

**Architecture Notes:**
- ContentArea is the single source of truth for "what to render at this URL"
- All routing logic centralized in one component for maintainability
- Lazy loading: components only fetch data when needed
- Error states handled gracefully with user-friendly messages
- Recursive tree search implemented efficiently with early exit
- Directory README detection uses try-catch pattern for simplicity
- All components support light/dark mode via CSS custom properties
- Type-safe integration with existing FileViewer, MarkdownView, etc.

**Next Step:** Step 15 - Branch selection (dropdown + non-HEAD branch reads)

---

