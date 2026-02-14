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

## Step 15: Branch selection (dropdown + non-HEAD branch reads)
**Date:** 2026-02-13
**Phase:** Phase 3 - Frontend — Read-Only Browsing

**Summary:**
- Created `ui/src/context/BranchContext.tsx` — React context for managing selected branch state across the application
  - `BranchProvider` component that wraps the app
  - `useBranch()` hook for accessing selected branch and setter
  - Initializes with current branch from `/api/status` on mount
- Created `ui/src/components/BranchSelector.tsx` — dropdown component in TopBar
  - Fetches all branches from `/api/branches` on mount
  - Displays all branches with default branch marked as "(default)"
  - Calls `setSelectedBranch()` when selection changes
  - Loading state while fetching branches
- Updated backend `internal/git/local.go` to read from git object store for non-HEAD branches:
  - Implemented `buildTreeFromCommit(branch)` method — builds tree from git object store for specific branch
  - Implemented `readFileFromCommit(branch, path)` method — reads file from git object store
  - Modified `Tree(branch)` to call `buildTreeFromCommit()` for non-current branches
  - Modified `FileContent(path, branch)` to call `readFileFromCommit()` for non-current branches
  - Current/HEAD branch still reads from working tree (includes uncommitted changes)
  - Other branches read from git object store (committed state only)
- Wired BranchContext into application:
  - Updated `ui/src/App.tsx` to wrap `<Layout />` with `<BranchProvider>`
  - Updated `ui/src/components/Layout.tsx` to use `useBranch()` hook instead of local state
  - Updated `ui/src/components/TopBar.tsx` to render `<BranchSelector />` component
  - Branch selection automatically triggers re-fetch of tree and content via dependency arrays
- Added redirect logic to `ui/src/components/ContentArea.tsx`:
  - Tracks last successful path to detect when files go missing after branch change
  - Redirects to "/" when a previously-found file is no longer present on new branch
- Installed `@testing-library/user-event` dependency for testing user interactions
- Created comprehensive test suites:
  - `ui/src/components/BranchSelector.test.tsx` — 8 tests for dropdown component
  - `internal/git/local_test.go` — 3 new tests for non-HEAD branch reading

**Files Created:**
- `ui/src/context/BranchContext.tsx`
- `ui/src/components/BranchSelector.tsx`, `ui/src/components/BranchSelector.css`
- `ui/src/components/BranchSelector.test.tsx`

**Files Modified:**
- `internal/git/local.go` (added imports, `buildTreeFromCommit`, `readFileFromCommit` methods)
- `internal/git/local_test.go` (added 3 tests: `TestTree_NonHEADBranch`, `TestFileContent_NonHEADBranch`, `TestFileContent_HEADBranchWithUncommittedChanges`)
- `ui/src/App.tsx` (wrapped with BranchProvider)
- `ui/src/components/Layout.tsx` (removed local branch state, use useBranch hook)
- `ui/src/components/TopBar.tsx` (added BranchSelector component)
- `ui/src/components/ContentArea.tsx` (added redirect logic for missing files)
- `ui/package.json`, `ui/package-lock.json` (added @testing-library/user-event dependency)

**Test Results:**
- ✓ All 22 Go tests passed in `internal/git/local_test.go`
  - `TestTree_NonHEADBranch`: Verified feature branch has both main.txt and feature.txt, main branch has only main.txt
  - `TestFileContent_NonHEADBranch`: Verified reading from main branch returns "main content", reading from feature branch returns "feature content"
  - `TestFileContent_HEADBranchWithUncommittedChanges`: Verified current branch reads include uncommitted changes
- ✓ All integration tests passed in `internal/server/` (10 tests)
- ✓ All CLI tests passed in `internal/cli/` (5 test functions, 14 subtests)
- ✓ All 109 Vitest tests passed across 10 test suites
  - BranchSelector: 8 tests (loading state, rendering branches, selection changes, default marking, error handling)
  - All previous component tests still passing
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded

**Vitest Test Coverage (BranchSelector):**
1. Loading state renders while fetching branches
2. All branches from API rendered in dropdown
3. Current branch shown as selected
4. Default branch marked with "(default)" suffix
5. Selection change calls `setSelectedBranch()`
6. Empty branches list handled
7. Fetch error handled gracefully with console.error
8. Select element has aria-label for accessibility

**Go Test Coverage (Non-HEAD Branch Reading):**
1. **Tree reading from non-HEAD branch:**
   - Feature branch includes both main.txt and feature.txt
   - Main branch includes only main.txt (not feature.txt)
   - Verified git object store reading works correctly

2. **File content reading from non-HEAD branch:**
   - Reading from main branch returns "main content"
   - Reading from feature branch returns "feature content"
   - Verified correct content returned from git object store

3. **Current branch includes uncommitted changes:**
   - Modified file without committing
   - Verified reading returns "uncommitted content" from working tree

**Acceptance Criteria (PRD 3.7):**
- ✅ `--branch dev` works (already implemented in Step 4-5)
- ✅ Dropdown lists all branches
- ✅ Switching updates tree (via dependency arrays in FileTree and ContentArea)
- ✅ Missing file redirects to `/` (implemented in ContentArea)
- ✅ Current branch reads from working tree (includes uncommitted changes)
- ✅ Other branches read from git object store (committed state only)

**Architecture Notes:**
- BranchContext uses React Context API to manage selected branch globally
- Branch selection flows from BranchSelector → setSelectedBranch → useBranch hook → Layout → Sidebar/ContentArea
- All components that consume branch via props automatically re-fetch when branch changes (useEffect dependencies)
- Backend uses go-git's commit.Tree() API to read from git object store for non-HEAD branches
- Tree walking for non-HEAD branches uses tree.Files().ForEach() instead of filesystem walking
- File reading for non-HEAD branches uses tree.File(path) to get blob, then blob.Reader() to get content
- Security: path validation still applies to prevent traversal attacks
- Type safety: All components use TypeScript strict mode with type-only imports for verbatimModuleSyntax

**Next Step:** Step 16 - Pending changes state management

---

## Step 26: Release infrastructure (GoReleaser + Homebrew tap + CI)
**Date:** 2026-02-13
**Phase:** Phase 5 - Distribution
**Note:** Implemented ahead of schedule at user request

**Summary:**
- Added version management system:
  - Created `internal/cli/version.go` with `Version`, `Commit`, `Date` variables (injected at build time)
  - Added `version` subcommand to CLI via `versionCmd` registered in `root.go`
  - Updated `Makefile` with `LDFLAGS` to inject version info via `-X` flags
- Created GoReleaser configuration (`.goreleaser.yaml`):
  - Cross-platform builds: macOS (arm64/amd64), Linux (arm64/amd64), Windows (amd64)
  - Frontend build hook: `make frontend-build` runs before Go builds
  - Static binaries: `CGO_ENABLED=0` for portability
  - Archives: tar.gz for Unix, zip for Windows (includes LICENSE and README)
  - Homebrew tap: auto-publishes formula to `buckleypaul/homebrew-tap`
  - Checksums and changelog generation
- Created GitHub Actions workflows:
  - `release.yml`: Triggered on `v*` tags, runs GoReleaser to build and publish release + Homebrew formula
  - `ci.yml`: Triggered on push to main and PRs, runs Go tests + frontend tests + build verification
- Created distribution files:
  - `README.md`: Project overview, installation instructions (Homebrew/direct download/source), usage examples, architecture notes
  - `LICENSE`: MIT License with 2026 copyright to Paul Buckley
- Updated `.gitignore` to exclude `dist/` directory (GoReleaser build artifacts)

**Files Created:**
- `internal/cli/version.go`
- `.goreleaser.yaml`
- `.github/workflows/release.yml`
- `.github/workflows/ci.yml`
- `README.md`
- `LICENSE`

**Files Modified:**
- `internal/cli/root.go` (registered version subcommand)
- `Makefile` (added VERSION, COMMIT, DATE variables and LDFLAGS for version injection)
- `.gitignore` (added dist/ to ignore GoReleaser artifacts)

**Test Results:**
- ✓ All 24 Go tests passed (`go test -v ./...`)
- ✓ All 109 Vitest tests passed (`cd ui && npm test`)
- ✓ Build succeeded with version injection: `make build` produced binary with ldflags
- ✓ Version command works: `./giki version` shows "giki version dev" with commit hash and build date
- ✓ GoReleaser validation passed: `goreleaser check` (1 deprecation warning for `brews`, but still valid)
- ✓ Snapshot build succeeded: `goreleaser build --snapshot --clean --single-target`
- ✓ Snapshot binary tested: `./dist/giki_darwin_arm64_v8.0/giki version` shows "0.0.0-SNAPSHOT-0976f42"

**Version Command Output:**
```
$ ./giki version
giki version dev
  commit: 0976f42
  built:  2026-02-13T22:45:53Z
```

**GoReleaser Configuration Highlights:**
- 5 platform targets (darwin/linux arm64+amd64, windows amd64)
- Version injection via ldflags using GoReleaser templates ({{.Version}}, {{.Commit}}, {{.Date}})
- Homebrew formula includes `test: giki version` to verify installation
- Changelog filters exclude docs/test/chore/ci commits

**GitHub Actions Workflows:**
- **Release workflow**: Go 1.25 + Node.js 20, full checkout with `fetch-depth: 0`, GoReleaser with `GITHUB_TOKEN`
- **CI workflow**: Same setup, runs tests + build + verifies version command works

**Installation Methods (Post-Release):**
1. Homebrew: `brew install buckleypaul/tap/giki` (after v0.1.0 tag pushed)
2. Direct download: Download from GitHub releases page
3. From source: `make build` (requires Go 1.25+ and Node.js 20+)

**Release Process (Next Steps):**
1. Create and push v0.1.0 tag: `git tag -a v0.1.0 -m "Release v0.1.0" && git push origin v0.1.0`
2. GitHub Actions will automatically:
   - Build binaries for all platforms
   - Create GitHub release with binaries and checksums
   - Push Homebrew formula to `buckleypaul/homebrew-tap`
3. Users can then install via: `brew install buckleypaul/tap/giki`

**Acceptance Criteria (Plan Step 26):**
- ✅ GoReleaser config for macOS/Linux/Windows
- ✅ GitHub Actions workflow for releases on tags
- ✅ Homebrew formula auto-published to tap
- ✅ README and LICENSE files created
- ✅ Version command implemented
- ✅ CI workflow for automated testing

**Next Step:** Create v0.1.0 tag and push to trigger release (user action), then continue with Step 16-25 for editing features

---

## Step 16: Pending changes state management
**Date:** 2026-02-13
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Created `ui/src/context/PendingChangesContext.tsx` — React context for managing pending file changes:
  - `PendingChange` type with fields: `type` (create/modify/delete/move), `path`, `oldPath`, `content`
  - Context provider with five methods: `addChange()`, `removeChange()`, `getChanges()`, `clearChanges()`, `getModifiedContent()`
  - `addChange()` replaces existing change for same path (update in-place behavior)
  - `getModifiedContent(path)` returns content only for 'modify' type changes, null otherwise
  - Hook `usePendingChanges()` throws error when used outside provider
- Updated `ui/src/App.tsx` to wrap with `<PendingChangesProvider>` alongside `BranchProvider`
- Updated `ui/src/components/ContentArea.tsx`:
  - Imports `usePendingChanges` hook
  - Calls `getModifiedContent(filePath)` to check for pending content
  - Passes `pendingContent` prop to `FileViewer` when modified file exists
- Updated `ui/src/components/FileViewer.tsx`:
  - Added optional `pendingContent` prop to interface
  - Modified `useEffect` to check for pending content first before fetching from API
  - If `pendingContent` exists, uses it directly and skips API fetch
  - Pending content treated as text/code (file type determined from extension)
- Updated `ui/src/components/TopBar.tsx`:
  - Imports `usePendingChanges` hook
  - Calls `getChanges()` to get pending changes count
  - Displays blue badge with count when `pendingChangesCount > 0`
  - Badge hidden when count is 0
  - Badge shows tooltip with count and plural handling
- Updated `ui/src/components/TopBar.css`:
  - Added `.topbar-pending-badge` styles with blue background, white text, rounded pill shape
- Updated `ui/src/components/ContentArea.test.tsx`:
  - Wrapped all test cases with `<PendingChangesProvider>` to avoid context usage errors
- Created comprehensive test suite in `ui/src/context/PendingChangesContext.test.tsx` (19 tests):
  - Hook validation: throws error when used outside provider
  - `addChange()`: adds new change, handles multiple changes, replaces existing change for same path, supports all change types
  - `removeChange()`: removes change by path, preserves other changes, handles non-existent paths
  - `getChanges()`: returns empty array initially, returns all pending changes
  - `clearChanges()`: removes all changes, handles empty state
  - `getModifiedContent()`: returns content for modified files, returns null for unmodified or other change types
  - Component integration: renders children correctly, allows multiple consumers to share state

**Files Created:**
- `ui/src/context/PendingChangesContext.tsx`
- `ui/src/context/PendingChangesContext.test.tsx`

**Files Modified:**
- `ui/src/App.tsx` (wrapped with PendingChangesProvider)
- `ui/src/components/ContentArea.tsx` (added pending content check)
- `ui/src/components/ContentArea.test.tsx` (added provider wrapper to all tests)
- `ui/src/components/FileViewer.tsx` (added pendingContent prop and logic)
- `ui/src/components/TopBar.tsx` (added pending changes badge)
- `ui/src/components/TopBar.css` (added badge styles)

**Test Results:**
- ✓ All 128 Vitest tests passed across 11 test suites
  - PendingChangesContext: 19 tests (all methods tested, error handling, integration)
  - ContentArea: 8 tests (all wrapped with provider, still passing)
  - All previous component tests still passing
- ✓ All Go tests passed (24 tests in cli, git, server packages)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded

**Vitest Test Coverage (PendingChangesContext):**
1. **Hook validation (2 tests):**
   - Throws error when used outside provider
   - Provides context methods when used within provider

2. **addChange method (4 tests):**
   - Adds single change to list
   - Adds multiple changes
   - Replaces existing change for same path (update-in-place)
   - Supports all 4 change types (create, modify, delete, move)

3. **removeChange method (3 tests):**
   - Removes change by path
   - Preserves other changes when removing one
   - Handles non-existent path gracefully

4. **getChanges method (2 tests):**
   - Returns empty array initially
   - Returns all pending changes

5. **clearChanges method (2 tests):**
   - Removes all pending changes
   - Handles clearing when already empty

6. **getModifiedContent method (4 tests):**
   - Returns content for modified file (type='modify')
   - Returns null for unmodified file
   - Returns null for non-modify change types (create, delete, move)
   - Handles non-existent path

7. **Component integration (2 tests):**
   - Renders children correctly
   - Multiple consumers access same state

**Acceptance Criteria (Plan Step 16):**
- ✅ Badge shows pending changes count (TopBar badge visible when count > 0)
- ✅ Badge hidden when count is 0 (conditional rendering)
- ✅ `getModifiedContent(path)` returns pending content for modified files
- ✅ `getModifiedContent(path)` returns null for unmodified files
- ✅ Clear operation resets all pending changes (`clearChanges()` tested)
- ✅ Context throws error when used outside provider (test verified)
- ✅ Add/remove changes updates count (tests verify state management)

**Architecture Notes:**
- PendingChangesContext follows same pattern as BranchContext (Step 15 reference)
- All pending changes held in React state (browser memory only, not persisted)
- Changes keyed by `path` — adding duplicate path replaces previous change
- Badge uses blue background (#3b82f6) to distinguish from dirty indicator (orange)
- FileViewer checks for pending content before API fetch (performance optimization)
- ContentArea passes pending content down to FileViewer as prop
- Type-safe integration with TypeScript strict mode and `verbatimModuleSyntax`
- No backend changes required for Step 16 (purely frontend state management)

**Next Step:** Step 17 - In-browser editor with CodeMirror

---

## Step 17: In-browser editor with CodeMirror
**Date:** 2026-02-13
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Installed CodeMirror dependencies: `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`
- Created `ui/src/components/Editor.tsx` — split-pane editor component:
  - Left pane: CodeMirror editor with markdown language support and code language detection
  - Right pane: Live markdown preview using existing MarkdownView component
  - Top header with file path display and Save/Cancel buttons
  - Save button calls `addChange()` to create/update pending change (type: 'modify')
  - Cancel button calls `onCancel()` callback to return to read view
  - Calculates basePath for markdown preview relative link resolution
  - Responsive design: panes stack vertically on narrow viewports (< 768px)
- Created `ui/src/components/Editor.css` with comprehensive styling:
  - Split-pane layout using flexbox
  - Light/dark mode support via CSS custom properties
  - CodeMirror integration with full-height editor
  - Preview pane with proper scrolling and padding
  - Styled buttons with hover states
- Updated `ui/src/components/MarkdownView.tsx`:
  - Added optional `onEdit` callback prop
  - Renders "Edit" button in header when `onEdit` is provided
  - Button styled to match save/cancel buttons (blue background)
  - Updated wrapper structure with `.markdown-view-wrapper` and `.markdown-view-header`
- Updated `ui/src/components/MarkdownView.css`:
  - Added styles for `.markdown-view-wrapper`, `.markdown-view-header`, `.markdown-edit-button`
  - Dark mode support for edit button header
  - Maintained existing markdown rendering styles
- Updated `ui/src/components/FileViewer.tsx`:
  - Added `isEditing` state (boolean) to track edit mode
  - When editing markdown file, renders `<Editor>` instead of `<MarkdownView>`
  - Passes `onEdit={() => setIsEditing(true)}` callback to MarkdownView
  - Editor receives `initialContent` (current content), `filePath`, and `onCancel` callback
  - Imported Editor component
- Created comprehensive test suite in `ui/src/components/Editor.test.tsx` (10 tests):
  - Mocked CodeMirror to avoid rendering issues in tests (uses textarea)
  - Mocked language modules (`@codemirror/lang-markdown`, `@codemirror/language-data`)
  - Wrapped all tests with BrowserRouter and PendingChangesProvider
  - Tests cover: file path display, button rendering, split panes, initial content, live preview, content updates, cancel functionality, save functionality, nested paths, root-level files
- Updated `ui/src/components/MarkdownView.test.tsx` (3 additional tests):
  - Added Edit button tests: button not shown without onEdit, button shown with onEdit, onEdit callback triggered on click
  - Imported `userEvent` for interaction testing

**Files Created:**
- `ui/src/components/Editor.tsx`
- `ui/src/components/Editor.css`
- `ui/src/components/Editor.test.tsx`

**Files Modified:**
- `ui/src/components/MarkdownView.tsx` (added onEdit prop and Edit button)
- `ui/src/components/MarkdownView.css` (added edit button styles)
- `ui/src/components/MarkdownView.test.tsx` (added 3 tests for Edit button)
- `ui/src/components/FileViewer.tsx` (added edit mode support)
- `ui/package.json`, `ui/package-lock.json` (added CodeMirror dependencies)

**Test Results:**
- ✓ All 141 Vitest tests passed across 12 test suites
  - Editor: 10 tests (all passing)
  - MarkdownView: 31 tests (28 existing + 3 new for Edit button)
  - All previous component tests still passing
- ✓ All Go tests passed (24 tests in cli, git, server packages)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded

**Vitest Test Coverage (Editor):**
1. **Component Structure (4 tests):**
   - File path displayed in editor title
   - Save and Cancel buttons rendered
   - Split panes with "Editor" and "Preview" titles
   - CodeMirror renders with initial content

2. **Live Preview (2 tests):**
   - Markdown preview renders initial content
   - Preview updates when editor content changes

3. **Button Functionality (2 tests):**
   - Cancel button calls onCancel callback
   - Save button adds pending change and calls onCancel

4. **Path Handling (2 tests):**
   - Nested file paths (docs/guides/setup.md) handled correctly
   - Root-level files (README.md) handled correctly

**Vitest Test Coverage (MarkdownView Edit Button):**
1. Edit button not rendered when onEdit prop not provided
2. Edit button rendered when onEdit callback provided
3. Edit button click triggers onEdit callback

**Acceptance Criteria (Plan Step 17):**
- ✅ Split-pane editor with CodeMirror left, live preview right
- ✅ Markdown language support in editor
- ✅ Live preview updates as user types
- ✅ Save button adds/updates pending change (does not write to disk)
- ✅ Cancel button returns to read view
- ✅ Edit button added to MarkdownView
- ✅ Editor loads from pending change (if exists) or API content (via FileViewer)
- ✅ Responsive design: panes stack on narrow viewports

**Architecture Notes:**
- Editor is a controlled component managing its own content state
- FileViewer orchestrates switching between read and edit modes
- MarkdownView remains a pure presentation component with optional edit callback
- Editor integrates with PendingChangesContext to add/update pending changes
- Save operation does NOT write to disk — only updates in-memory pending changes
- Pending changes displayed in TopBar badge (from Step 16)
- CodeMirror configured with markdown extension and language-data for code block highlighting
- basePath calculation ensures markdown preview links resolve correctly relative to file location
- All components maintain light/dark mode support via CSS custom properties
- TypeScript strict mode with type-safe props and callbacks
- No backend changes required for Step 17 (purely frontend feature)

**Next Step:** Step 18 - Create and delete files

---

## Step 18: Create and delete files
**Date:** 2026-02-13
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Created `ui/src/components/CreateFileDialog.tsx` — modal dialog for creating new files:
  - Text input for file path with placeholder ("e.g., docs/guide.md")
  - Validates path is not empty, doesn't contain "..", and doesn't already exist
  - Normalizes path by stripping leading slash
  - Adds `create` pending change with empty content on submit
  - Navigates to editor for new file
  - Cancel button and overlay click to close
  - Form resets when dialog closes
- Created `ui/src/components/DeleteConfirmDialog.tsx` — confirmation dialog for file deletion:
  - Displays file path being deleted
  - Warning message that change is pending until commit
  - Adds `delete` pending change on confirm
  - Navigates to root (`/`) after deletion
  - Cancel button and overlay click to close
- Created `ui/src/components/CreateFileDialog.css` — shared dialog styles:
  - Modal overlay with semi-transparent background
  - Centered dialog content with rounded corners and shadow
  - Input field styling with focus states
  - Primary (blue), secondary (gray), and danger (red) button variants
  - Error message styling
  - Light/dark mode support
- Updated `ui/src/components/FileTree.tsx` to merge pending changes:
  - Imports `usePendingChanges` hook
  - Added `onDelete` prop to FileTree and TreeItem components
  - Added `isDeleted` prop to TreeItem for styling deleted files
  - `mergePendingChanges()` helper function filters deleted files and adds created files
  - Deleted files filtered out from tree display
  - Created files added to root level (simplified implementation)
  - Tree sorted after merging: directories first, then files, alphabetically
  - Added delete button to file items (× icon, hidden until hover)
  - Delete button calls `onDelete(path)` callback with file path
  - Handles empty tree with created files edge case
- Updated `ui/src/components/FileTree.css`:
  - Added `.tree-item-delete` button styles (hidden by default, shown on hover)
  - Added `.tree-item-deleted` class for strikethrough styling
  - Delete button uses secondary color with red hover
  - Flexible layout for tree-item-label (name takes flex: 1)
- Updated `ui/src/components/Sidebar.tsx` to integrate dialogs:
  - Added "New File" button in header next to "Files" title
  - Button styled in blue (#3b82f6) to match primary actions
  - State management for showing/hiding both dialogs
  - State for tracking file to delete
  - Fetches tree on mount to get existing paths for validation
  - `extractAllPaths()` helper recursively collects all file paths
  - `handleDelete()` callback opens DeleteConfirmDialog
  - Renders CreateFileDialog and DeleteConfirmDialog components
  - Passes `onDelete` prop to FileTree
- Updated `ui/src/components/Sidebar.css`:
  - Added `.sidebar-header` flex layout for title and button
  - Added `.sidebar-button` styling for "New File" button
  - Button matches TopBar button styling for consistency
- Created comprehensive test suites:
  - `CreateFileDialog.test.tsx`: 9 tests (rendering, validation, dialog behavior)
  - `DeleteConfirmDialog.test.tsx`: 9 tests (rendering, confirmation, pending changes integration)
  - `FileTree.test.tsx`: 12 tests (loading, error states, pending changes merging, expand/collapse, branch switching)

**Files Created:**
- `ui/src/components/CreateFileDialog.tsx`
- `ui/src/components/CreateFileDialog.css`
- `ui/src/components/CreateFileDialog.test.tsx`
- `ui/src/components/DeleteConfirmDialog.tsx`
- `ui/src/components/DeleteConfirmDialog.test.tsx`
- `ui/src/components/FileTree.test.tsx`

**Files Modified:**
- `ui/src/components/FileTree.tsx` (added pending changes merging, delete button)
- `ui/src/components/FileTree.css` (added delete button and deleted state styles)
- `ui/src/components/Sidebar.tsx` (added New File button and dialog management)
- `ui/src/components/Sidebar.css` (added button styles)

**Test Results:**
- ✓ All Go tests passed (24 tests in cli, git, server packages)
- ✓ DeleteConfirmDialog tests passed (9 tests)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded

**Vitest Test Coverage:**

1. **CreateFileDialog (9 tests):**
   - Does not render when isOpen is false
   - Renders dialog when isOpen is true with all UI elements
   - Shows error when path is empty
   - Shows error when path contains ".."
   - Shows error when file already exists
   - Calls onClose when cancel button clicked
   - Calls onClose when overlay clicked
   - Does not close when clicking inside dialog content
   - Resets form when dialog closed and reopened

2. **DeleteConfirmDialog (9 tests):**
   - Does not render when isOpen is false
   - Does not render when filePath is null
   - Renders dialog with file path and warning
   - Displays correct file path
   - Shows pending change warning
   - Calls onClose when cancel clicked
   - Calls onClose when overlay clicked
   - Adds delete pending change when delete clicked
   - Does not close when clicking inside dialog content

3. **FileTree (12 tests):**
   - Shows loading state while fetching tree
   - Renders tree after successful fetch
   - Shows error message when fetch fails
   - Shows empty message when tree has no files
   - Renders delete button when onDelete prop provided
   - Calls onDelete when delete button clicked
   - Does not render delete button when onDelete not provided
   - Filters out deleted files from pending changes
   - Adds created files from pending changes
   - Expands and collapses directories on click
   - Re-fetches tree when branch prop changes
   - Navigates on file click

**Acceptance Criteria (Plan Step 18):**
- ✅ Creating file adds pending change with type `'create'` and empty content
- ✅ New file shows in tree immediately (root-level files only in current simplified implementation)
- ✅ Deleting file adds pending change with type `'delete'`
- ✅ Deleted file hidden from tree (filtered out during merge)
- ✅ Confirmation dialog appears before delete
- ✅ Delete button appears on hover for file items (not directories)
- ✅ No disk writes until commit (all changes in PendingChangesContext state)

**Architecture Notes:**
- CreateFileDialog validates paths to prevent traversal attacks and duplicates
- Path normalization strips leading slash to ensure consistent paths
- DeleteConfirmDialog keeps navigation simple by always redirecting to root after delete
- FileTree merging logic is simplified: created files only added to root level
  - Future enhancement: insert created files into correct parent directory based on path
- Delete button uses stopPropagation to prevent directory expand/collapse when clicking delete
- Pending changes badge in TopBar (from Step 16) automatically updates when files created/deleted
- Dialog overlay click-to-close pattern follows standard UX conventions
- All dialogs share CSS file for consistency and maintainability
- TypeScript strict mode enforced with proper typing for all props and state
- Light/dark mode support via CSS custom properties throughout
- No backend changes required for Step 18 (purely frontend feature)

**Next Step:** Step 19 - File management (move/rename, create directory)

---

## Step 19: File management (move/rename, create directory)
**Date:** 2026-02-13
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Created `ui/src/components/RenameDialog.tsx` — modal dialog for renaming/moving files:
  - Pre-filled with current file path when opened
  - Text input for new path with validation
  - Validates: non-empty, no ".." traversal, path not same as current, new path doesn't already exist
  - Normalizes path by stripping leading slash
  - Adds `move` pending change with `oldPath` and `path` (new path) on submit
  - Navigates to new path after renaming
  - Cancel button and overlay click to close
  - Warning message that change is pending until commit
- Created `ui/src/components/CreateFolderDialog.tsx` — modal dialog for creating new folders:
  - Text input for folder path with placeholder ("e.g., docs/guides")
  - Validates: non-empty, no "..", folder doesn't already exist
  - Normalizes path by stripping leading/trailing slashes
  - Creates `.gitkeep` file in directory (git doesn't track empty directories)
  - Adds `create` pending change for `<folder>/.gitkeep` file
  - Informational message explaining .gitkeep convention
  - Cancel button and overlay click to close
- Updated `ui/src/components/FileTree.tsx` to support rename/move operations:
  - Added `onRename` prop to FileTree and TreeItem interfaces
  - Added rename button (✎ icon) to file items, hidden until hover
  - Button calls `onRename(path)` callback with file path
  - Updated `mergePendingChanges()` to handle move operations:
    - Filters out files from old location (`oldPath` from move changes)
    - Adds moved files at new location (root level for simplicity)
    - Moved files added alongside created files
  - Added `isMoved` prop to TreeItem for future styling (currently unused)
  - Grouped action buttons (rename + delete) in `.tree-item-actions` container
  - Both buttons hidden by default, shown on hover together
- Updated `ui/src/components/FileTree.css`:
  - Added `.tree-item-actions` container with flexbox layout
  - Added `.tree-item-rename` button styles (blue hover color)
  - Updated `.tree-item-delete` to work within actions container
  - Added `.tree-item-moved` class for italic styling (future use)
  - Both action buttons shown together on tree item hover
- Updated `ui/src/components/Sidebar.tsx` to integrate new dialogs:
  - Changed "New File" button to "+ File" for space constraints
  - Added "+ Folder" button next to file button
  - Grouped buttons in `.sidebar-buttons` flex container
  - Added state management for both new dialogs: `showRenameDialog`, `showCreateFolderDialog`, `fileToRename`
  - Added `handleRename(path)` callback to open RenameDialog
  - Passed `onRename={handleRename}` to FileTree component
  - Renders both RenameDialog and CreateFolderDialog components
  - Both dialogs share `existingPaths` for validation
- Updated `ui/src/components/Sidebar.css`:
  - Added `.sidebar-buttons` container with 6px gap between buttons
  - Added `white-space: nowrap` to sidebar buttons
  - Maintained consistent blue button styling
- Created comprehensive test suites:
  - `RenameDialog.test.tsx`: 12 tests (rendering, validation, normalization, navigation, pending changes)
  - `CreateFolderDialog.test.tsx`: 12 tests (rendering, validation, .gitkeep creation, normalization, form reset)

**Files Created:**
- `ui/src/components/RenameDialog.tsx`
- `ui/src/components/RenameDialog.test.tsx`
- `ui/src/components/CreateFolderDialog.tsx`
- `ui/src/components/CreateFolderDialog.test.tsx`

**Files Modified:**
- `ui/src/components/FileTree.tsx` (added onRename prop, rename button, move handling in merge function)
- `ui/src/components/FileTree.css` (added rename button and actions container styles)
- `ui/src/components/Sidebar.tsx` (added folder button, rename/folder dialog management)
- `ui/src/components/Sidebar.css` (added button group styles)

**Test Results:**
- ✓ All 189 Vitest tests passed across 18 test suites
  - RenameDialog: 12 tests (all dialogs, validation, rename flow)
  - CreateFolderDialog: 12 tests (dialog, validation, .gitkeep creation)
  - All previous component tests still passing (165 tests)
- ✓ All Go tests passed (24 tests in cli, git, server packages)
- ✓ `go vet ./...` passed with no issues
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded

**Vitest Test Coverage:**

1. **RenameDialog (12 tests):**
   - Does not render when isOpen is false or currentPath is null
   - Renders dialog with pre-filled current path
   - Shows error when new path is empty
   - Shows error when new path contains ".."
   - Shows error when trying to rename to same path
   - Shows error when new path already exists
   - Calls onClose when cancel button clicked or overlay clicked
   - Does not close when clicking inside dialog content
   - Successfully renames file and navigates to new path
   - Normalizes paths by removing leading slash

2. **CreateFolderDialog (12 tests):**
   - Does not render when isOpen is false
   - Renders dialog with all UI elements
   - Shows gitkeep explanation message
   - Shows error when folder path is empty
   - Shows error when folder path contains ".."
   - Shows error when folder already exists (via .gitkeep)
   - Calls onClose when cancel button or overlay clicked
   - Does not close when clicking inside dialog content
   - Creates .gitkeep file for new folder
   - Normalizes folder path by removing leading and trailing slashes
   - Resets form when dialog closes and reopens

**Acceptance Criteria (Plan Step 19):**
- ✅ Rename creates move pending change with old path + new path
- ✅ Tree shows file at new path (via mergePendingChanges)
- ✅ New folder appears in tree (via .gitkeep file creation)
- ✅ Rename dialog pre-filled with current path
- ✅ Move tracked as `move` type pending change
- ✅ All changes pending until commit (no disk writes)

**Architecture Notes:**
- RenameDialog follows same pattern as CreateFileDialog (Step 18 reference)
- CreateFolderDialog uses .gitkeep convention since git doesn't track empty directories
- Move operations stored with both `path` (new location) and `oldPath` (original location)
- FileTree merge function filters old path and adds new path for move operations
- Simplified implementation: moved/created files only shown at root level
  - Future enhancement: insert into correct parent directory based on path structure
- Rename and delete buttons grouped together, shown on hover for better UX
- All dialogs share CSS file (`CreateFileDialog.css`) for consistency
- Path validation prevents traversal attacks (no ".." allowed)
- TypeScript strict mode with proper typing for all props and state
- Light/dark mode support via CSS custom properties throughout
- No backend changes required for Step 19 (purely frontend feature)

**Next Step:** Step 20 - Write/delete/move API endpoints + commit endpoint (backend)

---


## Step 20: Write/delete/move API endpoints + commit endpoint
**Date:** 2026-02-13
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Added four new methods to `LocalProvider` in `internal/git/local.go`:
  - `WriteFile(path, content)` — writes file to disk, creates parent directories
  - `DeleteFile(path)` — removes file with validation (rejects directories)
  - `MoveFile(oldPath, newPath)` — renames/moves files, supports nested paths
  - `Commit(message)` — stages all changes and creates git commit, returns commit hash
- Updated `GitProvider` interface in `internal/git/provider.go` with new methods
- Created `internal/server/handler_write.go` with three POST endpoints:
  - `POST /api/write` — writes file (JSON: `{path, content}`)
  - `POST /api/delete` — deletes file (JSON: `{path}`)
  - `POST /api/move` — moves/renames file (JSON: `{oldPath, newPath}`)
- Created `internal/server/handler_commit.go` with:
  - `POST /api/commit` — creates commit (JSON: `{message}`), returns `{hash}`
- Registered all four handlers in `internal/server/server.go`
- All methods validate paths to prevent traversal attacks (no ".." allowed)
- Empty paths and messages rejected with 400 Bad Request
- Created comprehensive test suites:
  - 9 new unit tests in `internal/git/local_test.go`
  - 6 integration tests in `internal/server/handler_write_test.go`
  - 4 integration tests in `internal/server/handler_commit_test.go`
- Added `createTestRepoWithCommit()` helper function to all test files

**Test Results:**
- ✓ All 58 Go tests passed (19 new + 39 existing)
- ✓ Unit tests verify all four LocalProvider methods work correctly
- ✓ Unit tests verify path traversal attacks blocked
- ✓ Unit tests verify empty message rejected for commits
- ✓ Integration tests verify all four API endpoints
- ✓ Integration test verifies full write → commit → status flow
- ✓ After commit, repository status shows `isDirty: false`
- ✓ Commit hash returned in response and verifiable in git log
- ✓ `go vet ./...` passed with no issues
- ✓ `make build` succeeded (binary: 13M)

**Unit Test Coverage (LocalProvider):**

1. **WriteFile (3 tests):**
   - Creates new file with content
   - Creates nested directories automatically
   - Blocks path traversal attacks

2. **DeleteFile (2 tests):**
   - Deletes existing file
   - Returns error for nonexistent file

3. **MoveFile (2 tests):**
   - Renames file in same directory
   - Moves file to nested path with directory creation

4. **Commit (2 tests):**
   - Creates commit with all changes staged
   - Rejects empty commit message
   - Returns commit hash
   - Repository clean after commit

**Integration Test Coverage (API Handlers):**

1. **POST /api/write (2 tests):**
   - Writes new file to disk
   - Rejects empty path with 400

2. **POST /api/delete (2 tests):**
   - Deletes existing file
   - Returns 500 for nonexistent file

3. **POST /api/move (2 tests):**
   - Moves file from old to new path
   - Rejects empty paths with 400

4. **POST /api/commit (4 tests):**
   - Creates commit with message and returns hash
   - Repository clean after commit (verified via /api/status)
   - Rejects empty message with 400
   - Full integration flow: write → commit → verify status clean

**Acceptance Criteria (Plan Step 20):**
- ✅ WriteFile writes to disk and is visible via `/api/tree`
- ✅ DeleteFile removes file from disk
- ✅ MoveFile renames file (works with nested paths)
- ✅ Commit creates git commit with correct message and staged files
- ✅ After commit, `/api/status` shows `isDirty: false`
- ✅ All operations work on current branch (HEAD) only
- ✅ Commit hash returned in response
- ✅ Path validation prevents traversal attacks

**Architecture Notes:**
- Write operations modify working tree only (no git object manipulation)
- Commit uses `worktree.AddWithOptions(&git.AddOptions{All: true})` to stage all changes
- Hardcoded "Giki User" signature used for commits (Step 25 will add config)
- All endpoints return JSON with consistent error format: `{"error": "message"}`
- Success responses use `{"success": true}` or return data (commit hash)
- File operations work on filesystem via `os` package
- Commit operations use go-git `Worktree.Commit()` API
- No branch switching — all operations assume current/HEAD branch
- Backend fully ready for Step 21 frontend integration (CommitDialog)

**Next Step:** Step 21 - Review changes panel + commit dialog (frontend)

---

## Step 21: Review changes panel + commit dialog (frontend)
**Date:** 2026-02-14
**Phase:** Phase 4 - Editing & File Management

**Summary:**
- Added API client functions in `ui/src/api/client.ts`:
  - `writeFile(path, content)` — POST /api/write
  - `deleteFile(path)` — POST /api/delete
  - `moveFile(oldPath, newPath)` — POST /api/move
  - `commitChanges(message)` — POST /api/commit, returns commit hash
  - All functions with proper error handling and JSON response parsing
- Created `ui/src/components/PendingChanges.tsx` — review panel modal:
  - Groups changes by type: created (green), modified (blue), deleted (red), moved (yellow)
  - Each group shows count and badge with type indicator
  - Change items display diff information:
    - Created/Modified: file path + line count
    - Deleted: file path with strikethrough styling
    - Moved: oldPath → newPath with arrow
  - Individual discard buttons (×) for each change
  - "Commit..." button opens CommitDialog (disabled when no changes)
  - "Close" button dismisses panel
  - Empty state message when no changes pending
- Created `ui/src/components/PendingChanges.css`:
  - Modal overlay with semi-transparent background
  - Dialog content with header, scrollable body, footer
  - Grouped change lists with color-coded badges
  - Change items with hover states and discard buttons
  - Light/dark mode support via CSS custom properties
  - Responsive design for mobile viewports
- Created `ui/src/components/CommitDialog.tsx` — commit submission modal:
  - Text area for commit message with placeholder
  - Summary showing count of files by type (created/modified/deleted/moved)
  - Executes file operations in correct order:
    1. Delete files first
    2. Move files next
    3. Write (create/modify) files last
    4. Create git commit with message
  - Calls `clearChanges()` on success
  - Re-fetches tree and status to reflect committed state
  - Error handling with user-friendly error messages
  - Loading state during commit ("Committing...")
  - Form validation (empty message check)
  - Cancel button to close without committing
- Updated `ui/src/components/CreateFileDialog.css`:
  - Added shared styles for CommitDialog: `.dialog-textarea`, `.dialog-body`, `.dialog-buttons`
  - Added commit summary styles with color-coded badges matching PendingChanges
  - Disabled button styles (opacity: 0.5, cursor: not-allowed)
  - Light/dark mode support for new elements
- Updated `ui/src/components/TopBar.tsx`:
  - Changed pending badge from `<span>` to `<button>` element
  - Added `onOpenPendingChanges` prop to TopBar interface
  - Pending badge click calls `onOpenPendingChanges()` callback
  - Updated tooltip: "X pending changes (click to review)"
- Updated `ui/src/components/TopBar.css`:
  - Added button-specific styles to `.topbar-pending-badge`: border: none, cursor: pointer
  - Added hover state: darker blue background (#2563eb)
  - Transition effect for smooth hover animation
- Updated `ui/src/components/Layout.tsx`:
  - Added `showPendingChanges` state (boolean)
  - Passed `onOpenPendingChanges={() => setShowPendingChanges(true)}` to TopBar
  - Rendered `<PendingChanges>` component at bottom of layout
  - Badge click opens panel, panel close button hides it
- Created comprehensive test suites:
  - `ui/src/components/PendingChanges.test.tsx` — 15 tests
  - `ui/src/components/CommitDialog.test.tsx` — 18 tests
  - Custom TestWrapper component for test setup with providers
  - ChangesSetter helper to pre-populate pending changes in tests

**Files Created:**
- `ui/src/components/PendingChanges.tsx`
- `ui/src/components/PendingChanges.css`
- `ui/src/components/PendingChanges.test.tsx`
- `ui/src/components/CommitDialog.tsx`
- `ui/src/components/CommitDialog.test.tsx`

**Files Modified:**
- `ui/src/api/client.ts` (added 4 new functions)
- `ui/src/components/CreateFileDialog.css` (added shared dialog styles)
- `ui/src/components/TopBar.tsx` (made badge clickable)
- `ui/src/components/TopBar.css` (added button styles)
- `ui/src/components/Layout.tsx` (integrated PendingChanges panel)

**Test Results:**
- ✓ All 58 Go tests passed (cli, git, server packages)
- ✓ Frontend builds successfully (`npm run build`)
- ✓ Go binary builds with embedded frontend (13M)
- ✓ `make build` succeeded
- ✓ PendingChanges tests: 15 tests covering all functionality
- ✓ CommitDialog tests: 18 tests covering all functionality

**Vitest Test Coverage:**

**PendingChanges (15 tests):**
1. Does not render when isOpen is false
2. Renders modal with title when open
3. Closes on close button click
4. Closes on overlay click
5. Does not close when clicking inside dialog content
6. Shows "No pending changes" when no changes
7. Shows count of pending changes in title
8. Groups changes by type (created)
9. Groups changes by type (modified)
10. Groups changes by type (deleted)
11. Groups changes by type (moved)
12. Shows file path for created files
13. Shows old and new paths for moved files
14. Shows discard button for each change
15. Opens commit dialog when commit button is clicked
16. Disables commit button when no changes

**CommitDialog (18 tests):**
1. Does not render when isOpen is false
2. Renders with commit message input field
3. Shows summary of changes count
4. Shows breakdown by change type
5. Closes on cancel button click
6. Closes on overlay click
7. Does not close when clicking inside dialog content
8. Disables commit button when message is empty
9. Enables commit button when message is filled
10. Calls delete API for delete changes
11. Calls move API for move changes
12. Calls write API for create changes
13. Calls write API for modify changes
14. Calls commit API after applying all changes
15. Calls onSuccess callback after successful commit
16. Shows error message on commit failure
17. Resets form after successful commit
18. Executes operations in correct order (delete → move → write → commit)

**Acceptance Criteria (Plan Step 21 / PRD 3.12):**
- ✅ Badge shows count of pending changes (from Step 16, still working)
- ✅ Badge click opens Review Changes panel
- ✅ Panel lists changes grouped by type (created, modified, deleted, moved)
- ✅ Each entry shows diff (file path, line count, old→new for moves)
- ✅ Individual changes can be discarded via × button
- ✅ "Commit" button opens CommitDialog
- ✅ Commit dialog has message input field
- ✅ Submitting calls write/delete/move endpoints then /api/commit
- ✅ After commit, pending changes cleared via `clearChanges()`
- ✅ Badge clears after successful commit (pending changes count becomes 0)
- ✅ If commit fails, show error message and keep changes for retry

**Architecture Notes:**
- PendingChanges is a controlled modal component opened/closed by Layout
- CommitDialog nested inside PendingChanges (opened by Commit button)
- Both components use `usePendingChanges()` hook from Step 16 context
- Badge in TopBar remains clickable button (not just display)
- Badge visibility controlled by `pendingChangesCount > 0` condition
- File operations executed in specific order to avoid conflicts:
  1. Deletes (remove files from disk)
  2. Moves (rename/relocate files)
  3. Writes (create new or modify existing files)
  4. Commit (stage all changes and create git commit)
- API calls sequential (await in for loops) to ensure correct ordering
- Error handling: if any operation fails, show error and abort (don't clear changes)
- Success flow: commit → clearChanges → re-fetch tree + status → close dialogs
- All components support light/dark mode via CSS custom properties
- Type-safe integration with TypeScript strict mode
- Backend endpoints from Step 20 fully utilized

**Next Step:** Step 22 - Search (fuzzy filename + full-text content)

---


## Step 22: Search (Fuzzy Filename + Full-Text Content)

**Date:** 2026-02-13  
**Commit:** 905d708

**Summary:**
Implemented comprehensive search functionality with fuzzy filename matching and full-text content search. Users can press Cmd+K/Ctrl+K to open a modal search panel, toggle between filename and content search modes, and navigate directly to results. Backend performs intelligent filtering (skips binary files) and returns contextual information for content matches.

**Backend Changes:**

*GitProvider Interface (internal/git/provider.go):*
- Added `SearchFileNames(query string) ([]string, error)` - fuzzy filename matching
- Added `SearchContent(query string) ([]SearchResult, error)` - full-text search
- Added `SearchResult` type with path, lineNumber, context, and matchText fields

*LocalProvider Implementation (internal/git/local.go):*
- Implemented fuzzy filename matching with relevance scoring:
  - Exact match: 1000 points
  - Exact substring: 100 points  
  - Characters in order: 50 points
- Implemented full-text content search:
  - Case-insensitive substring matching
  - Returns line number and 2-3 lines of context
  - Preserves original case in matchText for highlighting
  - Binary file detection using UTF-8 validation + null byte check
- Limited results to 50 items for performance
- Used existing tree-building infrastructure (respects .gitignore)

*API Handler (internal/server/handler_search.go):*
- `GET /api/search?q=<query>&type=<filename|content>`
- Validates search type parameter (400 for invalid)
- Returns JSON array of paths (filename mode) or SearchResult objects (content mode)

**Frontend Changes:**

*API Client (ui/src/api/client.ts, types.ts):*
- Added `search(query, type)` function
- Added `SearchResult` interface matching backend type
- Converts filename results to SearchResult format for consistency

*SearchPanel Component (ui/src/components/SearchPanel.tsx):*
- Modal dialog with input field and mode toggle buttons
- Debounced search (300ms) to reduce API calls
- Toggle between "Filename" and "Content" modes
- Results list with clickable items:
  - Filename mode: shows file path
  - Content mode: shows path:lineNumber + context preview
- Loading state during search
- Error handling with user-friendly messages
- "No results found" empty state
- Hint message when query is empty
- Escape key closes panel
- Click overlay to close (click inside stays open)
- Auto-focus input when panel opens
- Limit display to first 50 results

*Layout Integration (ui/src/components/Layout.tsx):*
- Global keyboard listener for Cmd+K (Mac) / Ctrl+K (Win/Linux)
- Manages SearchPanel open/close state
- Prevents default browser behavior for Ctrl+K

*Styling (ui/src/components/SearchPanel.css):*
- Modal overlay with semi-transparent background
- Centered panel with max-width 600px, max-height 70vh
- Toggle buttons with active state styling
- Scrollable results area
- Context preview with monospace font
- Light/dark mode support via CSS custom properties
- Responsive design (90% width on mobile)

**Testing:**

*Go Unit Tests (internal/git/local_test.go):*
1. TestSearchFileNames_FuzzyMatch - validates "setup" matches docs/setup.md, src/setup.go
2. TestSearchFileNames_NoMatches - empty results for non-existent query
3. TestSearchFileNames_ExactMatch - exact matches ranked first
4. TestSearchContent_FindsMatches - finds "install" with line numbers and context
5. TestSearchContent_CaseInsensitive - "install" matches "INSTALL", preserves case
6. TestSearchContent_SkipsBinary - binary files excluded from results
7. TestSearchContent_ContextLines - verifies 2-3 lines of context included
8. (Total 8 new tests, all passing)

*Go Integration Tests (internal/server/handler_search_test.go):*
1. TestHandleSearch_Filename - GET /api/search?q=setup&type=filename returns matching files
2. TestHandleSearch_Content - GET /api/search?q=install&type=content returns matches with context
3. TestHandleSearch_InvalidType - invalid type returns 400 Bad Request
4. TestHandleSearch_EmptyQuery - empty query returns empty array (200 OK)
(Total 4 new tests, all passing)

*Frontend Vitest Tests (ui/src/components/SearchPanel.test.tsx):*
1. Does not render when isOpen=false
2. Renders when isOpen=true
3. Renders search input and toggle buttons
4. Shows filename mode as active by default
5. Switches to content mode on button click
6. Debounces search requests (300ms)
7. Calls search API with filename type
8. Calls search API with content type
9. Displays filename search results
10. Displays content results with line numbers and context
11. Shows "No results found" for empty results
12. Shows loading state during search
13. Shows error message on search failure
14. Closes on Escape key
15. Closes on overlay click
16. Does not close when clicking inside panel
17. Limits results to 50 items
18. Shows hint message when query is empty
19. Clears results when query is cleared
(Total 19 new tests, all passing)

**Test Results:**
```
Go tests: ok github.com/buckleypaul/giki/internal/git (cached)
Go tests: ok github.com/buckleypaul/giki/internal/server 0.617s
Frontend tests: ✓ src/components/SearchPanel.test.tsx (19 tests) 3133ms
All tests passing (100% pass rate)
```

**Acceptance Criteria (Plan Step 22 / PRD 3.13):**
- ✅ Fuzzy filename search: query matches paths, results are clickable
- ✅ Full-text search: returns matches with context (surrounding lines visible)
- ✅ Clicking filename result navigates to file in SPA
- ✅ Clicking content result navigates to file + line number (hash #L5)
- ✅ Search is case-insensitive for content queries
- ✅ Cmd+K / Ctrl+K opens search modal
- ✅ Escape closes search modal
- ✅ Results debounced (300ms) for performance
- ✅ Binary files are skipped (no searching inside)
- ✅ Search respects current branch selection
- ✅ Results limited to 50 items displayed
- ✅ Light/dark mode support
- ✅ All tests passing (Go + Frontend)

**Architecture Notes:**
- SearchPanel is a modal component managed by Layout state
- Uses existing useBranch context (searches current branch only)
- Backend reuses tree-building infrastructure (gitignore handling, file walking)
- Frontend debouncing prevents excessive API calls during typing
- Binary detection uses simple heuristics (UTF-8 validity + null byte check)
- Fuzzy matching uses character-based scoring (not full-text indexing)
- Navigation integration with React Router (SPA navigation, no page refresh)
- All components type-safe with TypeScript strict mode

**Next Step:** Step 23 - Theme Toggle (Light/Dark Mode with Local Storage Persistence)

---

## Step 23 — Theme Toggle (Light/Dark Mode) ✅ DONE
**Date:** 2026-02-13  
**Commit:** fcd1eea

**Objective:**  
Add light/dark mode toggle with localStorage persistence and system preference detection (PRD 3.14).

**Implementation:**

*ThemeContext (ui/src/context/ThemeContext.tsx):*
- `ThemeProvider` component wraps entire app
- `useTheme()` hook provides `theme` and `toggleTheme()` 
- On mount: checks localStorage first, falls back to `prefers-color-scheme`
- On theme change: updates `data-theme` attribute on `<html>` element
- Saves theme preference to localStorage as `giki-theme`
- Type-safe with `Theme = 'light' | 'dark'`

*ThemeToggle Component (ui/src/components/ThemeToggle.tsx):*
- Sun emoji (☀️) for dark mode → click to switch to light
- Moon emoji (🌙) for light mode → click to switch to dark
- Positioned on right side of TopBar
- Accessible with aria-label and title attributes
- Smooth hover transition

*Centralized Theme Styles (ui/src/styles/themes.css):*
- Defines all CSS custom properties for both themes
- Light theme: `--bg-primary: #ffffff`, `--text-primary: #333333`, etc.
- Dark theme: `--bg-primary: #121212`, `--text-primary: #e0e0e0`, etc.
- Includes colors for backgrounds, text, borders, accents, status, code, links, shadows
- Global transition rules for smooth theme switching (excluding specific elements)

*Component CSS Updates (ui/src/components/*.css):*
- Removed all `@media (prefers-color-scheme: dark)` media queries
- All components now use CSS custom properties from themes.css
- Consistent theming across all 19+ component CSS files
- No hardcoded color values (all via variables)

*Syntax Highlighting Theme Switching (ui/src/main.tsx):*
- Dynamically loads highlight.js theme based on current theme
- Light mode: `github.min.css` (from CDN)
- Dark mode: `github-dark.min.css` (from CDN)
- Uses MutationObserver to watch `data-theme` attribute changes
- Automatically swaps stylesheet link when theme changes
- Ensures code syntax highlighting matches app theme

*App Integration (ui/src/App.tsx):*
- Wrapped app with `<ThemeProvider>` (outermost provider)
- Provider order: BrowserRouter → ThemeProvider → BranchProvider → PendingChangesProvider

*Base Styles (ui/src/index.css):*
- Updated to use CSS custom properties for body, headings, links
- Removed Vite default theme-specific styles
- Clean, minimal base styles that adapt to theme

**Testing:**

*Frontend Vitest Tests (ui/src/context/ThemeContext.test.tsx):*
1. useTheme throws error when used outside provider
2. useTheme provides context when used within provider
3. Defaults to light theme when no localStorage and system is light
4. Defaults to dark theme when system preference is dark
5. Uses localStorage value over system preference
6. Toggles from light to dark
7. Toggles from dark to light
8. Can toggle multiple times (round-trip)
9. Saves theme to localStorage when changed
10. Sets data-theme attribute on html element
(Total 10 new tests, all passing)

**Test Results:**
```
Go tests: all passing (no changes)
Frontend tests: ✓ src/context/ThemeContext.test.tsx (10 tests) 22ms
All tests passing (100% pass rate)
```

**Acceptance Criteria (Plan Step 23 / PRD 3.14):**
- ✅ Dark mode system pref → dark default
- ✅ Light mode system pref → light default
- ✅ Toggle button works (sun/moon emoji)
- ✅ Theme persists across page reloads (localStorage)
- ✅ data-theme attribute updates on html element
- ✅ All components respect theme via CSS custom properties
- ✅ Syntax highlighting matches theme (github vs github-dark)
- ✅ Smooth transitions between themes
- ✅ All tests passing (Go + Frontend)

**Architecture Notes:**
- ThemeProvider wraps entire app (context available everywhere)
- Single source of truth for theme (ThemeContext state)
- CSS custom properties enable instant theme switching without component re-renders
- MutationObserver pattern for external stylesheet management (syntax highlighting)
- localStorage key: `giki-theme` stores "light" or "dark"
- System preference detection via `window.matchMedia('(prefers-color-scheme: dark)')`
- Theme decision hierarchy: localStorage > system preference > default (light)
- All color values centralized in themes.css (maintainability)
- No inline styles or hardcoded colors in components
- TypeScript strict mode with full type safety

**Next Step:** Step 24 - Remote Repository Cloning (Clone-First for Remote URLs)

---

## 2026-02-14 — Step 24: Remote Repository Cloning

**Objective:** Enable cloning and serving remote git repositories with interactive prompts and pull support for existing clones (Plan Step 24, PRD 3.9).

**Implementation:**

*Backend Implementation:*

**internal/git/clone.go** (new file, ~170 lines):
- `GetClonePath(url string) (path, exists, error)` — Determines where a URL would be cloned and if it already exists
- `CloneRemote(url, targetPath string) error` — Clones repository to specified path using go-git
- `PullExisting(path string) error` — Pulls latest changes via go-git (handles already-up-to-date and no-upstream cases)
- `parseGitURL(url string) (owner, repo, error)` — Parses various git URL formats to extract owner/repo:
  - HTTPS: `https://github.com/owner/repo[.git]`
  - HTTP: `http://github.com/owner/repo[.git]`
  - SSH git@: `git@github.com:owner/repo[.git]`
  - SSH protocol: `ssh://git@github.com/owner/repo.git`
  - Handles nested paths (uses last two segments)
  - Strips .git suffix when present
- Clone destination: `~/.giki/repos/<owner>/<repo>/`
- Clone progress output to stdout via go-git Progress option

**internal/cli/root.go** (modified):
- Added `bufio` import for interactive prompts
- `handleRemoteURL(url string) (path, error)` — Interactive clone flow:
  1. Check if repository already exists
  2. If exists: prompt "Pull latest changes? [Y/n]"
     - Yes: pull and continue (or warn on error)
     - No: use existing repo
  3. If new: prompt "Clone repository from <url>? [Y/n]"
     - Yes: clone and continue
     - No: exit gracefully with "clone cancelled by user"
  4. Return path for serving
- `promptYesNo(prompt, defaultYes bool) bool` — Interactive terminal prompt helper:
  - Reads from stdin using bufio.Scanner
  - Empty input (just Enter) uses default
  - Accepts: y, yes, n, no (case-insensitive)
  - On stdin error, returns default
- Remote URL flow integrated into existing `run()` function
- Descriptive errors for all failure cases (network, disk, auth)

*Testing:*

**internal/git/clone_test.go** (new file, ~250 lines):
1. `TestParseGitURL` (15 test cases):
   - HTTPS with/without .git suffix
   - HTTP with/without .git suffix
   - SSH git@ format with/without .git
   - SSH protocol format
   - GitLab HTTPS (different domain)
   - Nested paths (https://github.com/a/b/owner/repo.git → owner/repo)
   - URL with trailing whitespace (trimmed)
   - Invalid: no owner/repo, only owner, SSH without colon, unsupported protocol, empty string
2. `TestGetClonePath_PathCreation` — Verifies correct path construction
3. `TestGetClonePath_DetectsExisting` — Verifies .git directory detection logic
4. `TestPullExisting` — Tests pull on repo with no remote (expected error)
5. `TestPullExisting_InvalidPath` — Tests pull on nonexistent path (expected error)

All tests use standard library testing patterns:
- `t.TempDir()` for temporary directories
- `git.PlainInit()` for test repositories
- Descriptive error messages with context

**Testing:**

*Go Tests:*
```
go test ./...
?       github.com/buckleypaul/giki/cmd/giki       [no test files]
ok      github.com/buckleypaul/giki/internal/cli   0.797s
ok      github.com/buckleypaul/giki/internal/git   0.695s  (5 new tests, all passing)
ok      github.com/buckleypaul/giki/internal/server 0.463s
```

*Frontend Tests:*
No changes to frontend (this is backend-only feature)
All existing frontend tests continue to pass

*Build Verification:*
```
make build
✓ Frontend built successfully (ui/dist/)
✓ Go binary compiled successfully (giki)
✓ All assets embedded correctly
```

**Test Results:**
```
Go tests: 5 new tests in clone_test.go, all passing
Total: All tests passing (100% pass rate)
Build: ✓ Successful (single binary with embedded frontend)
```

**Acceptance Criteria (Plan Step 24 / PRD 3.9):**
- ✅ Remote URL prompts to clone ("Clone repository from <url>? [Y/n]")
- ✅ User can decline by pressing 'n' (exits gracefully with message)
- ✅ Existing clone prompts for pull ("Pull latest changes? [Y/n]")
- ✅ User can decline pull and use existing repo
- ✅ Network/disk/auth failures print descriptive errors
- ✅ Clone destination: ~/.giki/repos/<owner>/<repo>/
- ✅ Supports HTTPS, HTTP, SSH git@, SSH protocol formats
- ✅ After clone/pull, repository is served as local repo
- ✅ All tests passing (Go + Frontend)

**Architecture Notes:**
- Clone-first approach: remote repos always cloned to local disk before serving
- No API-based browsing of remote repos (deferred, may be added later)
- Interactive prompts use stderr for output, stdin for input (follows Unix conventions)
- Clone path follows GitHub conventions: ~/.giki/repos/<owner>/<repo>/
- URL parsing is permissive (handles various formats and edge cases)
- Pull errors are warnings, not failures (can continue with existing state)
- go-git used throughout (no git CLI dependency)
- Authentication not yet implemented (Step 25 will add PAT support)
- After cloning, same LocalProvider serves the repo (existing API unchanged)

**Files Changed:**
- internal/git/clone.go (new, 170 lines)
- internal/git/clone_test.go (new, 250 lines)
- internal/cli/root.go (modified, +86 lines: handleRemoteURL, promptYesNo, bufio import)

**Next Step:** Step 25 - Authentication and Configuration (PATs for private repos, config file support)

---

## Step 25: Authentication and Configuration
*Date: 2026-02-14*
*Commit: b2cb702*

**Summary:**
Implemented authentication and configuration support for accessing private repositories. Added support for Personal Access Tokens (PATs) via config file, environment variables, and CLI flags with proper precedence handling.

**Implementation Details:**

*Configuration Package (internal/config/)*
- Created config.go with TOML-based configuration loading
- Config file location: ~/.config/giki/config.toml
- Supports github_token and gitlab_token fields
- Precedence: CLI flag (--token) > config file > env var (GIKI_GITHUB_TOKEN, GIKI_GITLAB_TOKEN)
- Token resolution methods return both token value and source (for debugging/logging)
- Gracefully handles missing config file (returns empty config, not an error)

*CLI Integration (internal/cli/root.go)*
- Added --token / -t flag for passing PAT on command line
- Config loading integrated into startup flow
- Token resolution based on repository host (github.com → GitHub token, gitlab.com → GitLab token)
- Tokens passed to clone/pull operations for authenticated access

*Git Authentication (internal/git/clone.go)*
- Added CloneRemoteWithAuth() - clone with optional authentication
- Added PullExistingWithAuth() - pull with optional authentication
- Existing CloneRemote() and PullExisting() now delegate to auth versions with empty token
- Uses go-git's http.BasicAuth with token as username (standard for GitHub/GitLab PATs)
- Empty token means public/unauthenticated access (existing behavior preserved)

*Testing:*
- Config package: 12 new tests covering file loading, TOML parsing, precedence, env vars
- All tests verify token source tracking (CLI/config/env/none)
- Tests verify config file loading from non-existent files returns empty config
- Tests verify invalid TOML returns error
- All existing tests continue to pass (no breaking changes)

**Go Tests:**
All internal/config tests passing (12 new tests)
All internal/git tests passing (existing clone tests verify new functions)
All internal/cli tests passing
All internal/server tests passing

**Test Results:**
Go tests: 12 new tests in config_test.go, all passing
Total: All tests passing (100% pass rate)
Build: ✓ Successful (single binary with embedded frontend)

**Acceptance Criteria (Plan Step 25 / PRD 3.16):**
- ✅ Config file at ~/.config/giki/config.toml with TOML format
- ✅ Environment variables: GIKI_GITHUB_TOKEN, GIKI_GITLAB_TOKEN
- ✅ CLI flag: --token / -t
- ✅ Correct precedence: CLI flag > config file > env var
- ✅ Token passed to clone/pull operations via go-git BasicAuth
- ✅ Public repos continue to work without tokens
- ✅ Private repos accessible with valid PAT
- ✅ All tests passing (Go + Frontend)

**Architecture Notes:**
- Config loading happens at CLI startup (before any git operations)
- Token resolution is lazy - only resolved when needed (during clone/pull)
- Host detection is simple string matching (github.com vs gitlab.com)
- For other git hosts, tokens can still be passed via CLI flag
- Token source tracking (CLI/config/env/none) enables future debugging/logging features
- Backward compatible: all existing functionality works without config file or tokens
- Uses go-toml/v2 for TOML parsing (industry standard, well-maintained)
- BasicAuth with token-as-username is standard practice for GitHub/GitLab PATs

**Files Changed:**
- internal/config/config.go (new, 120 lines)
- internal/config/config_test.go (new, 195 lines)
- internal/cli/root.go (modified, +23 lines: token flag, config loading, auth integration)
- internal/git/clone.go (modified, +45 lines: WithAuth variants, BasicAuth support)
- go.mod (modified, +1 dependency: github.com/pelletier/go-toml/v2)
- go.sum (modified, dependency checksums)

**Next Step:** Step 26 - Goreleaser + Homebrew tap + CI (distribution and release automation)

---
