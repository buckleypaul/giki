# Giki Implementation Plan

## Context

Giki is a Go CLI tool that turns any git repository into a browsable wiki in the browser. The PRD (`prd.md`) and product brief (`product-brief.md`) define 16 core features. No implementation code exists yet — only these two planning documents.

This plan breaks the full build into 27 granular steps. Each step is independently testable and must be committed before moving on. Two living documents track progress:

- **`progress-log.md`** — append a summary after completing each step
- **`architecture.md`** — create at step 1, update whenever the architecture evolves

## Technical Decisions

| Decision | Choice |
|----------|--------|
| Language | Go |
| Frontend | React + TypeScript (Vite) |
| Markdown rendering | Client-side with `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-slug` |
| Git library | go-git (pure Go, no CLI dependency) |
| Editor | CodeMirror 6 |
| Testing | Go `testing` + Vitest + Playwright E2E |
| Remote repos | Clone-first (API-based browsing deferred) |
| Scope | Core features only (no nice-to-haves) |
| Embedding | `embed.FS` — Vite builds to `ui/dist/`, Go embeds it into the binary |

## Project Structure

```
giki/
├── cmd/giki/main.go
├── internal/
│   ├── cli/root.go
│   ├── server/
│   │   ├── server.go
│   │   ├── spa.go
│   │   ├── handler_tree.go
│   │   ├── handler_file.go
│   │   ├── handler_branches.go
│   │   ├── handler_status.go
│   │   ├── handler_write.go
│   │   ├── handler_commit.go
│   │   └── handler_search.go
│   ├── git/
│   │   ├── provider.go
│   │   ├── local.go
│   │   └── clone.go
│   └── config/config.go
├── ui/
│   ├── embed.go
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/client.ts
│       ├── components/
│       ├── context/
│       ├── hooks/
│       └── styles/
├── e2e/
├── Makefile
├── .goreleaser.yaml
├── go.mod
├── architecture.md
└── progress-log.md
```

## Dev Workflow

Two processes during development:
1. `make frontend-dev` — Vite dev server on :5173 with HMR
2. `go run ./cmd/giki .` (with `GIKI_DEV=1`) — Go server on :4242, proxies non-API requests to Vite

Vite's `vite.config.ts` proxies `/api` requests to `localhost:4242`.

For production: `make build` runs `npm run build` then `go build`, producing a single binary with embedded assets.

---

## Instructions

### Step-Runner Workflow

Each step can be implemented in a separate conversation. `progress-log.md` is the source of truth for what's been completed.

#### 1. Determine the next step

Read `progress-log.md` and find the last completed step. The next step is N+1 (or Step 1 if the log is empty). Check the Dependency Graph below to confirm all prerequisites for that step are met before proceeding.

#### 2. Gather context (Explore agent)

Spawn an Explore agent (`Task` tool, `subagent_type=Explore`) to build a focused implementation brief. The agent should:

- Read `progress-log.md` to confirm the last completed step
- Read `plan.md` to extract the next step's full **Do**, **Test**, and **Acceptance** sections
- Read `architecture.md` for current architecture
- Explore existing source files the step will modify or depend on
- Return a focused implementation brief containing: step number, title, Do/Test/Acceptance details, relevant existing code snippets, and dependencies from prior steps

#### 3. Implement from the brief

The main agent receives the brief and:

- Implements the step according to its **Do** section
- Runs the tests specified in the **Test** section
- Verifies the **Acceptance** criteria are met

#### 4. After completing each step

> 1. Run the tests specified for that step
> 2. Commit with a descriptive message referencing the step number (e.g., `"Step 1: Project scaffold and Go module init"`)
> 3. Append a summary to `progress-log.md` (date, step number, what was done, test results)
> 4. Update `architecture.md` if the step introduced or changed architectural components

---

## Phase 1: Foundation

### Step 1 — Project scaffold, Go module, Makefile

**Do:**
- `go mod init github.com/buckleypaul/giki`
- Create directory structure: `cmd/giki/`, `internal/cli/`, `internal/server/`, `internal/git/`, `internal/config/`, `ui/`
- Create `cmd/giki/main.go` — trivial `func main()` that prints `"giki"` and exits
- Create `Makefile` with targets: `build`, `dev`, `test`, `clean`, `frontend-build`, `frontend-dev`
- Create `.gitignore` — `ui/dist/`, `ui/node_modules/`, `giki` binary, `.DS_Store`
- Create `architecture.md` with initial project overview and directory structure
- Create `progress-log.md` with header

**Test:** `go build ./cmd/giki` succeeds; `go vet ./...` passes; `make build` produces binary

---

### Step 2 — GitHub repository setup

**Do:**
- Create GitHub repo `buckleypaul/giki` using `gh repo create`
- Add remote origin
- Push initial scaffold

**Test:** `git remote -v` shows GitHub remote; `gh repo view` works

---

### Step 3 — Vite + React scaffold with embed.FS wiring

**Do:**
- Init Vite + React + TypeScript in `ui/` (`npm create vite@latest . -- --template react-ts`)
- Configure `vite.config.ts` with proxy: `/api` -> `http://localhost:4242`
- Create `ui/embed.go` with `//go:embed dist` directive exposing `var Dist embed.FS`
- Create `internal/server/spa.go` — handler serving static files from embedded FS, falling back to `index.html` for non-API paths (standard SPA pattern)
- Create `internal/server/server.go` — creates `http.ServeMux`, mounts SPA handler, listens on port
- Add dev mode (`GIKI_DEV=1` env var) that proxies to Vite dev server instead of serving embedded files

**Files:** `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/index.html`, `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/embed.go`, `internal/server/spa.go`, `internal/server/server.go`

**Test:**
- `make frontend-build` produces `ui/dist/index.html`
- `go build ./cmd/giki` succeeds after frontend build
- Running binary + hitting `http://localhost:4242/` returns React app HTML
- Hitting `/nonexistent` returns `index.html` (SPA fallback)
- Hitting `/api/anything` does NOT fall through to SPA

---

### Step 4 — CLI with Cobra (flags, argument parsing, browser open)

**Do:**
- Add `github.com/spf13/cobra` dependency
- Create `internal/cli/root.go` — root command `giki [path-or-url]`:
  - 0 or 1 positional args, default `.`
  - Flags: `--port` / `-p` (int, default 4242), `--branch` / `-b` (string)
  - Detect local path vs URL (heuristic: starts with `http://`, `https://`, `git@`)
  - Validate local path exists
  - Check port availability; error if in use
- Open default browser to `http://localhost:<port>` after server starts
- Wire `cmd/giki/main.go` to call `cli.Execute()`

**Tests:** `internal/cli/root_test.go`
- `.` resolves to cwd
- `/tmp/path` sets local path
- `https://github.com/org/repo` detected as URL
- `--port 9090` sets port
- `--branch dev` sets branch
- Invalid path produces error

**Acceptance (PRD 3.1):**
- `giki .` starts server on :4242, opens browser
- `giki -p 9090 .` starts on :9090
- `giki /nonexistent` prints error, exits non-zero
- Port in use prints `"Error: port 4242 is already in use"`, exits non-zero

---

### Step 5 — Git provider interface + local repo validation

**Do:**
- Create `internal/git/provider.go` — `GitProvider` interface:
  ```go
  type GitProvider interface {
      Tree(branch string) (*TreeNode, error)
      FileContent(path, branch string) ([]byte, error)
      Branches() ([]BranchInfo, error)
      Status() (*RepoStatus, error)
  }
  ```
  Plus types: `TreeNode`, `BranchInfo`, `RepoStatus`
- Create `internal/git/local.go` — `LocalProvider` struct:
  - `NewLocalProvider(path, branch string)` — opens repo with `go-git PlainOpen`, validates git repo, resolves branch
  - Error if not a git repo: `"<path> is not a git repository"`
  - Error if branch not found: `"branch '<branch>' not found"`
- Wire CLI to create `LocalProvider`, pass to server

**Tests:** `internal/git/local_test.go`
- Opening the giki repo itself succeeds
- Non-git directory returns expected error
- Nonexistent branch returns expected error
- HEAD branch resolves correctly
- Use `testing.TempDir()` + `git.PlainInit()` for test repos

**Acceptance (PRD 3.1):**
- `giki .` inside git repo starts successfully
- `giki .` outside git repo prints error, exits non-zero
- `giki --branch nonexistent .` prints error, exits non-zero

---

## Phase 2: Core API Endpoints

### Step 6 — `/api/tree` endpoint

**Do:**
- Implement `LocalProvider.Tree(branch)`:
  - For current branch: read working tree, respect `.gitignore`
  - Combine tracked + untracked-non-ignored files
  - Build nested `TreeNode` tree, sorted: directories first, then files, case-insensitive alphabetical
- Create `internal/server/handler_tree.go`: `GET /api/tree?branch=<branch>` returns JSON tree

**Tests:**
- Unit: temp repo with known structure -> verify tree shape
- Unit: `.gitignore`d files excluded
- Unit: tracked dotfiles (`.github/`) included
- Unit: sort order correct
- Integration: `GET /api/tree` returns valid JSON

**Acceptance (PRD 3.3):** Tree matches `git ls-files` + untracked non-ignored; directories above files

---

### Step 7 — `/api/file/<path>` endpoint

**Do:**
- Implement `LocalProvider.FileContent(path, branch)`: read file from working tree, return raw bytes, error if not found
- Create `internal/server/handler_file.go`: `GET /api/file/<path>?branch=<branch>` returns raw content with correct `Content-Type` (via `mime.TypeByExtension` + `http.DetectContentType` fallback). 404 JSON for missing files.

**Tests:**
- Unit: read known file, verify contents
- Unit: read nonexistent file, verify error
- Integration: `GET /api/file/README.md` returns markdown text
- Integration: `GET /api/file/nonexistent` returns 404

---

### Step 8 — `/api/branches` endpoint

**Do:**
- Implement `LocalProvider.Branches()`: iterate `repo.Branches()`, mark HEAD as default
- Create `internal/server/handler_branches.go`: `GET /api/branches` returns JSON array

**Tests:**
- Unit: temp repo with multiple branches -> all returned, default flagged
- Integration: `GET /api/branches` returns JSON array

**Acceptance (PRD 3.7):** All local branches listed; default branch flagged

---

### Step 9 — `/api/status` endpoint

**Do:**
- Implement `LocalProvider.Status()`: return source path, current branch, `isDirty` (via `worktree.Status()`)
- Create `internal/server/handler_status.go`: `GET /api/status` returns JSON

**Tests:**
- Unit: clean repo -> `dirty: false`
- Unit: modified file -> `dirty: true`
- Integration: `GET /api/status` returns correct JSON

**Acceptance (PRD 3.8):** Dirty/clean state reported accurately

---

## Phase 3: Frontend — Read-Only Browsing

### Step 10 — React app shell (Layout, TopBar, Sidebar)

**Do:**
- Install `react-router-dom`
- Create `components/Layout.tsx` — CSS Grid/Flexbox three-zone layout
- Create `components/TopBar.tsx` — repo source, branch display, dirty indicator
- Create `components/Sidebar.tsx` — toggle button, placeholder for tree
- Responsive: sidebar collapses < 768px, shows hamburger toggle
- Set up React Router with catch-all `/*` route
- Create `api/client.ts` — typed fetch functions: `fetchTree()`, `fetchFile(path)`, `fetchBranches()`, `fetchStatus()`

**Tests (Vitest):**
- Layout renders three zones
- Sidebar collapses at narrow viewport
- API client functions have correct URL shapes

**Acceptance (PRD 3.2):** Three zones visible on desktop; sidebar collapses on narrow viewport

---

### Step 11 — File tree component

**Do:**
- Create `components/FileTree.tsx`:
  - Fetch from `/api/tree` on mount
  - Recursive tree: directories expandable, files clickable
  - Collapsed by default; click toggles
  - Clicking file navigates via `useNavigate`
  - Expand/collapse state in React state (session only)
- Wire into `Sidebar.tsx`

**Tests (Vitest):**
- Renders tree matching mock data
- Directory click expands/collapses
- File click triggers navigation
- Directories render before files

**Acceptance (PRD 3.3):** Tree matches API; directories first; expand/collapse works and persists in session

---

### Step 12 — Markdown rendering

**Do:**
- Install `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug`
- Create `components/MarkdownView.tsx`:
  - Uses `<ReactMarkdown>` with GFM, syntax highlighting, heading anchors
  - Custom link component: relative links -> React Router `<Link>` (SPA nav); external -> `target="_blank"`
  - Custom image component: relative `src` rewritten to `/api/file/<path>`
- Install highlight.js CSS theme

**Tests (Vitest):**
- GFM table renders as `<table>`
- Task list checkboxes rendered and disabled
- Fenced code block gets highlight classes
- Relative link -> `<Link>`; external link -> `target="_blank"`
- Relative image src rewritten to `/api/file/...`
- Heading generates anchor ID

**Acceptance (PRD 3.4):** GFM features render correctly; SPA links work without reload; images render inline; anchor navigation works

---

### Step 13 — Non-markdown file rendering

**Do:**
- Create `components/CodeView.tsx` — syntax-highlighted source with line numbers (highlight.js, language from extension)
- Create `components/ImageView.tsx` — `<img>` with `src="/api/file/<path>"`
- Create `components/BinaryCard.tsx` — filename, human-readable size, MIME type
- Create `utils/fileType.ts` — categorize file path: `markdown | code | image | binary | unknown`
- Create `components/FileViewer.tsx` — orchestrator: fetch content, determine type, render appropriate component. For unknown: try UTF-8 decode -> CodeView, else BinaryCard.

**Tests (Vitest):**
- `fileType.ts`: `.md` -> markdown, `.go` -> code, `.png` -> image, `.zip` -> binary
- Each view component renders correctly
- FileViewer routes to correct sub-component

**Acceptance (PRD 3.5):** `.go` -> syntax-highlighted; `.png` -> inline image; `.zip` -> info card; extensionless text -> plain text; extensionless binary -> info card

---

### Step 14 — URL routing, directory listings, 404

**Do:**
- Create `components/ContentArea.tsx` — reads path from React Router, decides what to render:
  - `/` -> root `README.md` or "No README found" message
  - `/path/to/file.md` -> fetch and render file
  - `/path/to/dir/` -> `dir/README.md` or `DirectoryListing`
  - Nonexistent -> `NotFound`
- Create `components/DirectoryListing.tsx` — heading + flat list of children (dirs first, files second, alphabetical, clickable links)
- Create `components/NotFound.tsx` — "File not found: /<path>" with link to `/`
- Scroll to heading anchors when URL has `#fragment`
- Browser back/forward works via React Router

**Tests (Vitest):**
- `/` renders README when exists
- `/` shows empty-state message when no README
- `/docs/` renders directory listing when no docs/README
- `/nonexistent` renders NotFound

**Acceptance (PRD 3.6):** URL-based navigation works; directory listings show; 404 page shows; browser history works

---

### Step 15 — Branch selection (dropdown + non-HEAD branch reads)

**Do:**
- Create `components/BranchSelector.tsx` — dropdown in TopBar, fetches `/api/branches`, shows current as selected
- Create `context/BranchContext.tsx` — React context for selected branch, passed to all API calls
- On branch change: re-fetch tree, re-render content. If current file missing on new branch -> redirect to `/`
- **Backend update** in `internal/git/local.go`: when `branch` param differs from HEAD, read from git object store (committed state) instead of working tree. Current branch reads working tree (uncommitted changes visible).

**Tests:**
- Go: reading file from non-HEAD branch returns committed content
- Go: reading file from HEAD branch returns working tree content
- Vitest: dropdown renders branches; selection triggers re-fetch

**Acceptance (PRD 3.7):** `--branch dev` works; dropdown lists all branches; switching updates tree; missing file redirects to `/`

---

## Phase 4: Editing & File Management

### Step 16 — Pending changes state management

**Do:**
- Create `context/PendingChangesContext.tsx`:
  ```typescript
  type PendingChange = {
    type: 'create' | 'modify' | 'delete' | 'move';
    path: string;
    oldPath?: string;
    content?: string;
  };
  ```
  Methods: `addChange()`, `removeChange()`, `getChanges()`, `clearChanges()`, `getModifiedContent(path)`
- Update `ContentArea.tsx`: show pending content instead of API content for modified files
- Update `TopBar.tsx`: show badge with pending changes count

**Tests (Vitest):**
- Add/remove changes updates count
- `getModifiedContent` returns pending content or null
- Clear resets list

---

### Step 17 — In-browser editor with CodeMirror

**Do:**
- Install `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `@codemirror/language-data`
- Create `components/Editor.tsx`:
  - Split-pane: CodeMirror left, live `MarkdownView` preview right
  - Markdown language support + basic keybindings
  - "Save" button adds/updates pending change (does NOT write to disk)
  - "Cancel" returns to read view
- Add "Edit" button to `MarkdownView.tsx`
- Editor loads from pending change (if exists) or `/api/file/<path>`

**Tests (Vitest):**
- Editor renders CodeMirror + preview
- Typing updates preview
- Save adds pending change
- Cancel returns to read view

**Acceptance (PRD 3.10):** Split-pane editor with live preview; save creates pending change; no disk writes

---

### Step 18 — Create and delete files

**Do:**
- Create `components/CreateFileDialog.tsx` — "New File" button in sidebar, dialog for file path
- Create `components/DeleteConfirmDialog.tsx` — confirmation dialog
- On create: add `create` pending change, navigate to editor
- On delete: add `delete` pending change, navigate to `/`
- Update `FileTree.tsx` to merge pending changes (show new files, mark deleted)

**Tests (Vitest):**
- Creating file adds pending change, shows in tree
- Deleting file adds pending change, hides/marks in tree
- Confirmation dialog appears before delete

**Acceptance (PRD 3.10):** New file creates pending change; delete creates pending change; no disk writes until commit

---

### Step 19 — File management (move/rename, create directory)

**Do:**
- Create `components/RenameDialog.tsx` — pre-filled with current path, editable
- Create `components/CreateFolderDialog.tsx` — "New Folder" button in sidebar
- Move tracked as `move` pending change (old path + new path)
- Update `FileTree.tsx` to reflect moves

**Tests (Vitest):**
- Rename creates move pending change
- Tree shows file at new path
- New folder appears in tree

**Acceptance (PRD 3.11):** Rename/move tracked as pending; new folder appears in sidebar

---

### Step 20 — Write/delete/move API endpoints + commit endpoint

**Do:**
- Backend `internal/server/handler_write.go`:
  - `POST /api/write` — `{"path": "...", "content": "..."}` writes file to disk
  - `POST /api/delete` — `{"path": "..."}` deletes file
  - `POST /api/move` — `{"oldPath": "...", "newPath": "..."}` moves file
- Backend `internal/server/handler_commit.go`:
  - `POST /api/commit` — `{"message": "..."}` stages all + creates git commit via go-git
- Add methods to `LocalProvider`: `WriteFile`, `DeleteFile`, `MoveFile`, `Commit`

**Tests:**
- Go: WriteFile writes to disk
- Go: DeleteFile removes file
- Go: MoveFile moves file
- Go: Commit creates git commit with correct message and staged files
- Go integration: POST /api/write -> POST /api/commit -> GET /api/status shows clean

---

### Step 21 — Review changes panel + commit dialog (frontend)

**Do:**
- Create `components/PendingChanges.tsx`:
  - Opened via TopBar badge click
  - Lists changes grouped by type (created, modified, deleted, moved)
  - Shows simple diff per entry
  - Individual changes can be discarded
- Create `components/CommitDialog.tsx`:
  - Text field for commit message
  - Submit: iterates pending changes calling write/delete/move endpoints, then POST /api/commit
  - On success: clear pending, re-fetch tree + status
  - On failure: show error

**Tests (Vitest):**
- PendingChanges renders grouped changes
- CommitDialog calls API endpoints in order

**Acceptance (PRD 3.12):** Badge shows count; review panel shows diffs; discard removes change; commit creates git commit; badge clears after commit

---

## Phase 5: Search, Theming, Remote

### Step 22 — Search (fuzzy filename + full-text content)

**Do:**
- Backend `internal/server/handler_search.go`:
  - `GET /api/search?q=<query>&type=filename` — fuzzy file name matching
  - `GET /api/search?q=<query>&type=content` — full-text search, returns file path + line numbers + context (2-3 lines)
- Add methods to `LocalProvider`: `SearchFileNames`, `SearchContent`
- Frontend `components/SearchPanel.tsx`:
  - Search input in sidebar (or `Cmd+K` / `Ctrl+K` modal)
  - Toggle between filename and content modes
  - Debounced results (300ms)
  - File results clickable; content results navigate + scroll to line

**Tests:**
- Go: SearchFileNames("setu") matches `docs/setup.md`
- Go: SearchContent("install") returns matches with line numbers + context
- Vitest: renders results, clicking navigates

**Acceptance (PRD 3.13):** Fuzzy filename search works; full-text search returns context; clicking results navigates

---

### Step 23 — Theming (light/dark mode)

**Do:**
- Create `context/ThemeContext.tsx`:
  - On mount: check `localStorage`, fallback to `prefers-color-scheme`
  - Toggle updates state, saves to `localStorage`, sets `data-theme` on `<html>`
- Create `components/ThemeToggle.tsx` — sun/moon button in TopBar
- Create `styles/themes.css` — CSS custom properties for both themes (`--bg-primary`, `--text-primary`, etc.)
- Update all components to use CSS custom properties
- Ensure syntax highlighting themes switch with dark/light

**Tests (Vitest):**
- Default matches system preference
- Toggle changes `data-theme` attribute
- Persists in localStorage

**Acceptance (PRD 3.14):** Dark mode system pref -> dark default; toggle works; persists across reloads

---

### Step 24 — Remote repository cloning

**Do:**
- Create `internal/git/clone.go`:
  - `CloneRemote(url)` — parse URL for `<owner>/<repo>`, clone to `~/.giki/repos/<owner>/<repo>` via go-git
  - If exists: return flag for "already exists" (CLI prompts for pull)
  - `PullExisting(path)` — `git pull` equivalent via go-git
- Update `internal/cli/root.go`:
  - URL detected -> invoke clone flow
  - Terminal prompts: "Clone <owner>/<repo>? [Y/n]" and "Already exists. Pull? [Y/n]"
  - `n` to clone -> exit gracefully
  - Clone/pull failure -> descriptive error (auth, network, disk)
- After clone, serve as local repo

**Tests:**
- Go: URL parsing extracts owner/repo for various formats
- Go: prompt handling (mock stdin)
- Go integration: clone flow with public repo (tag as integration)

**Acceptance (PRD 3.9):** Remote URL prompts to clone; `n` exits gracefully; existing clone prompts for pull; failure prints descriptive error

---

### Step 25 — Authentication and configuration

**Do:**
- Create `internal/config/config.go`:
  - Load `~/.config/giki/config.toml` (use `github.com/pelletier/go-toml/v2`)
  - Env vars: `GIKI_GITHUB_TOKEN`, `GIKI_GITLAB_TOKEN`
  - CLI flag: `--token` (add to Cobra)
  - Precedence: CLI flag > config file > env var
- Update `internal/git/clone.go`: use resolved token for HTTPS auth (go-git `http.BasicAuth`)
- Wire config loading into CLI startup

**Tests:**
- Go: config file parsing
- Go: precedence (flag > config > env)
- Go: token passed to clone auth

**Acceptance (PRD 3.16):** PAT in config used for clones; env var used as fallback; `--token` overrides both

---

## Phase 6: Distribution & E2E

### Step 26 — Goreleaser + Homebrew tap + CI

**Do:**
- Create `.goreleaser.yaml`:
  - Cross-platform: macOS (arm64, amd64), Linux (arm64, amd64), Windows (amd64)
  - `before.hooks`: `make frontend-build`
  - Homebrew tap: `buckleypaul/homebrew-tap`
- Create `.github/workflows/release.yml` — triggered on `v*` tag push, runs `goreleaser release`
- Create `.github/workflows/ci.yml` — runs on PR/push to main: frontend build, Go tests, Vitest, Go build

**Tests:**
- `goreleaser check` validates config
- `goreleaser build --snapshot --clean` produces binaries

**Acceptance (PRD 5):** Goreleaser produces cross-platform binaries; Homebrew formula works; single binary, no runtime deps

---

### Step 27 — Playwright E2E tests

**Do:**
- Set up Playwright in `e2e/`:
  - `e2e/package.json` with `@playwright/test`
  - `e2e/playwright.config.ts` — starts giki binary against a test fixture repo
- Create test fixture: `e2e/fixtures/test-repo/` with README, docs, source, images, .gitignore, multiple branches
- Write E2E tests:
  1. Navigation: root loads README, sidebar click loads file, back/forward works
  2. Markdown: GFM table, code blocks, relative links SPA-navigate
  3. File tree: directories first, expand/collapse, .gitignored hidden
  4. Non-markdown: code view, image view, binary card
  5. Branch switching: dropdown works, tree updates, missing file -> `/`
  6. URL routing: direct URL, 404, directory listing
  7. Editor: open, type, save, pending changes appear
  8. Commit: edit file, commit, verify in git log
  9. Search: filename, content, click navigates
  10. Theme: toggle, persists on reload
  11. Responsive: sidebar collapses at narrow viewport

**Tests:** All Playwright specs pass

---

## Dependency Graph

```
Phase 1: 1 -> 2 -> 3 -> 4 -> 5
Phase 2: 5 -> 6 -> 7;  5 -> 8;  5 -> 9
Phase 3: 3 -> 10 -> 11;  6,7 -> 11;  11 -> 12 -> 13 -> 14;  8,9 -> 15
Phase 4: 14 -> 16 -> 17 -> 18 -> 19 -> 20 -> 21
Phase 5: 14 -> 22;  10 -> 23;  5 -> 24 -> 25
Phase 6: 21,22,23,24,25 -> 26 -> 27
```

## Key Architecture Notes

1. **Working tree vs git objects**: Current/HEAD branch reads from filesystem (uncommitted changes visible). Other branches read from git object store (committed state only).
2. **Pending changes in browser state**: All edits held in React context until explicit commit. Refreshing loses pending changes — acceptable tradeoff to avoid server-side state.
3. **SPA with API separation**: All non-`/api/` routes serve `index.html`. React Router handles client-side routing. Go server only serves static files + JSON API.
4. **Proxy dev workflow**: Vite proxies `/api` to Go server. No CORS issues. Mirrors production behavior.

## Verification

After all steps complete:
1. `make build` produces a single binary
2. `./giki .` opens the giki repo itself as a wiki in the browser
3. Navigate files, switch branches, view markdown/code/images
4. Edit a markdown file, see live preview, commit changes
5. Search for files and content
6. Toggle dark/light mode
7. `giki https://github.com/some/public-repo` clones and serves
8. All Go tests pass (`go test ./...`)
9. All Vitest tests pass (`cd ui && npm test`)
10. All Playwright tests pass (`cd e2e && npx playwright test`)
