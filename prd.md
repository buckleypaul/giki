# Giki — Product Requirements Document

## 1. Introduction

**Giki** is a Go CLI tool that turns any git repository into a browsable wiki in your browser. Point it at a local repo (or a remote URL), and giki launches a local web server serving the repository's contents as navigable, rendered markdown pages with a file-explorer sidebar.

- See [product-brief.md](product-brief.md) for the high-level product overview.
- **Target users**: developers, teams, and anyone who uses git repositories as knowledge bases, documentation stores, or personal wikis.

---

## 2. Goals & Non-Goals

### Goals

- **Instant wiki from any git repo** — zero configuration, single command.
- **Local-first** — all functionality works against the local filesystem with no network dependency.
- **Zero runtime dependencies** — ships as a single static binary.

### Non-Goals

- CI/CD or automation integrations.

---

## 3. Core Features

### 3.1 CLI

#### Commands

| Command | Behavior |
|---------|----------|
| `giki .` | Serve the current working directory |
| `giki /path/to/repo` | Serve a local repo at the given path |
| `giki <url>` | Clone the remote repo locally, then serve the clone (see 3.9) |

#### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port`, `-p` | `4242` | Port for the local HTTP server |
| `--branch`, `-b` | repo HEAD | Branch to display on startup |

#### Behavior

1. Validate that the input is a git repository (local) or a cloneable URL (remote).
2. Start an HTTP server on the specified port.
3. Open the user's default browser to `http://localhost:<port>`.

#### Acceptance Criteria

- Running `giki .` inside a git repo starts a server and opens the browser.
- Running `giki .` outside a git repo prints an error: `"Error: <path> is not a git repository"` and exits with a non-zero code.
- Running `giki -p 9090 .` starts the server on port 9090.
- If the requested port is already in use, print `"Error: port <port> is already in use"` and exit.
- Running `giki --branch feature/x .` opens the wiki on branch `feature/x`. If the branch does not exist, print `"Error: branch 'feature/x' not found"` and exit.

---

### 3.2 UI Layout

The browser UI is a three-zone layout:

- **Top bar** — Repo source (local path or "cloned from \<url\>"), branch-selector dropdown, dirty/clean indicator (local repos only).
- **Sidebar** — Collapsible file tree. Clicking a file loads it in the main content area.
- **Main content area** — Rendered markdown or file preview.

#### Responsive Behavior

- On viewports narrower than 768 px, the sidebar collapses to a hamburger toggle.
- The sidebar can be manually collapsed/expanded at any viewport width.

#### Acceptance Criteria

- All three zones are visible on page load at desktop widths.
- The top bar always displays the repo source and current branch.
- The dirty/clean indicator is only shown for local repos.
- On narrow viewports the sidebar auto-collapses and a toggle button appears.

---

### 3.3 File Tree (Sidebar)

The tree is built from the git working tree, respecting `.gitignore`.

#### Sorting

- Directories first, then files.
- Alphabetical (case-insensitive) within each group.

#### Expand / Collapse

- Directories are collapsed by default on first load.
- Clicking a directory toggles it open/closed.
- Expand/collapse state is persisted in the browser session (not across sessions).

#### Visibility Rules

- **Tracked dot files** (`.github/`, `.eslintrc`, etc.) are visible.
- **Gitignored files** are hidden — anything listed in `.gitignore` (or global gitignore) that is not tracked is excluded from the tree.
- Untracked, non-ignored files are visible.

#### File Icons (nice-to-have)

- Distinct icons for markdown, code, image, and generic files.

#### Acceptance Criteria

- The tree matches the set of files visible via `git ls-files` plus untracked non-ignored files.
- Directories sort above files.
- Clicking a directory expands it; clicking again collapses it.
- Navigating to another file and back preserves expand/collapse state within the same session.
- A file listed in `.gitignore` and not tracked does not appear in the tree.
- A tracked file whose name starts with `.` does appear in the tree.

---

### 3.4 Markdown Rendering

Giki renders GitHub Flavored Markdown (GFM).

#### Supported GFM Features

| Feature | Details |
|---------|---------|
| Tables | Standard GFM table syntax |
| Task lists | `- [ ]` / `- [x]` rendered as read-only checkboxes |
| Strikethrough | `~~text~~` |
| Autolinks | URLs and email addresses auto-linked |
| Fenced code blocks | Triple-backtick blocks with language tag |
| Syntax highlighting | Language detection from the fence tag (e.g., ` ```go `) |

#### Internal Links

- Relative markdown links (e.g., `[Setup](docs/setup.md)`) navigate within giki as SPA transitions — no full-page reload.
- Relative links to non-markdown files open the appropriate file view.
- Absolute external links (`https://...`) open in a new tab.

#### Images

- Relative image references (e.g., `![](images/logo.png)`) render inline, loaded from the repo's working tree.
- External image URLs render inline as standard `<img>` tags.

#### Heading Anchors

- Each heading generates an anchor ID (e.g., `## Setup` becomes `#setup`).
- Navigating to `file.md#setup` scrolls to that heading.
- Anchor IDs follow GitHub's slug algorithm (lowercase, hyphens for spaces, strip special chars).

#### Table of Contents (nice-to-have)

- Auto-generated from headings, displayed above or beside the content.

#### Acceptance Criteria

- A markdown file with a GFM table renders as an HTML table.
- Task list checkboxes are visible and read-only (clicking does nothing).
- A fenced code block tagged ` ```python ` renders with Python syntax highlighting.
- Clicking a relative link `[other](other.md)` navigates to `other.md` without a full page reload; the URL updates to `/other.md`.
- A relative image `![](img/photo.png)` renders the image inline.
- Navigating to `/docs/setup.md#installation` scrolls to the "Installation" heading.

---

### 3.5 Non-Markdown File Handling

All files are visible in the tree regardless of type.

| File Type | Rendering |
|-----------|-----------|
| Text / code files | Syntax-highlighted source view (language inferred from extension) |
| Images (png, jpg, gif, svg, webp) | Render inline as `<img>` |
| Other binary files | Show filename, file size (human-readable), and MIME type. No preview |
| Unknown extensions | Attempt text display; if the content is not valid UTF-8, fall back to binary info card |

#### Acceptance Criteria

- Opening a `.go` file shows syntax-highlighted Go source.
- Opening a `.png` renders the image inline.
- Opening a `.zip` shows: filename, size (e.g., "2.4 MB"), and MIME type (`application/zip`). No download or preview.
- Opening a file with no extension that contains valid UTF-8 text renders as plain text.
- Opening a file with no extension that contains binary data shows the binary info card.

---

### 3.6 URL Routing

URLs mirror the repository file structure exactly.

| URL | Behavior |
|-----|----------|
| `/` | Render root `README.md`. If none exists, show the file tree with an empty content area and a centered message: "No README found in this repository." |
| `/docs/setup.md` | Render `docs/setup.md` |
| `/docs/` or `/docs` | If `docs/README.md` exists, render it. Otherwise show a directory listing of `docs/` |
| `/path/to/image.png` | Render the image inline |
| `/nonexistent` | Show a 404 page: "File not found: /nonexistent" with a link back to `/` |

#### Directory Listings

When a directory URL is accessed and no `README.md` is present in that directory, display:

- The directory path as a heading.
- A flat list of immediate children (directories first, then files, alphabetical).
- Each item is a clickable link.

#### Acceptance Criteria

- `localhost:4242/docs/setup.md` renders the markdown file at `docs/setup.md`.
- `localhost:4242/` renders the root `README.md` when it exists.
- `localhost:4242/` shows the empty-state message when no root `README.md` exists.
- `localhost:4242/src/` shows a directory listing when `src/README.md` does not exist.
- `localhost:4242/does-not-exist` returns a 404 page with a link to `/`.
- Browser back/forward navigation works correctly (SPA history).

---

### 3.7 Branch Selection

#### CLI

- `--branch` / `-b` sets the initial branch on startup.
- If omitted, the repo's HEAD branch is used.

#### In-Browser

- A dropdown in the top bar lists all local branches.
- Selecting a branch reloads the file tree and re-renders the current file (or falls back to `/` if the file doesn't exist on that branch).
- The currently active branch is visually indicated in the dropdown.

#### Acceptance Criteria

- Starting with `--branch dev` opens the wiki on the `dev` branch.
- The dropdown lists all branches returned by `git branch`.
- Switching from `main` to `dev` updates the file tree to reflect `dev`'s contents.
- If the currently viewed file does not exist on the new branch, the view redirects to `/`.

---

### 3.8 Local Repository Support

Giki reads files directly from the **working tree** — not only committed state.

- Uncommitted changes (modified, staged, or new untracked files) are visible.
- The top bar shows a **dirty indicator** when `git status` reports uncommitted changes (e.g., a yellow dot or "uncommitted changes" label).
- When the working tree is clean, the indicator shows clean state (e.g., a green dot or "clean").

#### File-Watching & Auto-Refresh (nice-to-have)

- Watch the working tree for changes via fsnotify or similar.
- When a change is detected, push an update to the browser (via WebSocket or SSE) and re-render the affected file.

#### Acceptance Criteria

- Editing a file on disk and reloading the page in the browser shows the updated content.
- A repo with uncommitted changes shows the dirty indicator.
- A repo with a clean working tree shows the clean indicator.

---

### 3.9 Remote Repository Cloning

When the user provides a remote URL (e.g., `giki https://github.com/org/repo`), giki does **not** browse via API. Instead, it clones the repo locally.

#### Flow

1. Parse the URL to extract `<owner>/<repo>`.
2. Prompt the user in the terminal:
   ```
   Clone org/repo to ~/.giki/repos/org/repo? [Y/n]
   ```
3. If accepted, run `git clone <url> ~/.giki/repos/org/repo`.
4. If the directory already exists and is a valid git repo, prompt:
   ```
   ~/.giki/repos/org/repo already exists. Pull latest changes? [Y/n]
   ```
   - If yes, run `git pull`.
   - If no, serve the existing clone as-is.
5. After cloning (or using existing), serve it as a local repo — all local features (working tree reads, dirty indicator, branch selection) apply.

#### Error Handling

| Error | Behavior |
|-------|----------|
| Invalid URL (not parseable as a git remote) | `"Error: '<input>' is not a valid git repository URL"` |
| Clone failure (auth) | `"Error: clone failed — authentication required. Check your SSH keys or HTTPS credentials."` |
| Clone failure (network) | `"Error: clone failed — could not reach <host>. Check your network connection."` |
| Clone failure (disk) | `"Error: clone failed — insufficient disk space."` |

#### Acceptance Criteria

- `giki https://github.com/org/repo` prompts to clone, clones on confirmation, and opens the wiki.
- Answering `n` to the clone prompt exits gracefully with no error.
- If `~/.giki/repos/org/repo` already exists, the user is prompted to pull or use existing.
- A failed clone prints a descriptive error and exits with a non-zero code.

---

### 3.10 In-Browser Editor

Add the ability to create, edit, and delete markdown files from the browser.

#### Create

- A "New File" button in the sidebar opens a dialog to enter the file path (e.g., `docs/new-page.md`).
- The new file opens in the editor with an empty document.

#### Edit

- Clicking "Edit" on a markdown file opens a **split-pane view**: editor on the left, live preview on the right.
- The editor is a textarea or a lightweight code editor (e.g., CodeMirror).
- Changes are not written to disk immediately — they are held as **pending changes** (see 3.12).

#### Delete

- A "Delete" action on any file opens a confirmation dialog: `"Delete docs/page.md? This cannot be undone."`
- Confirmed deletions are tracked as pending changes.

#### Acceptance Criteria

- Clicking "New File," entering `notes/ideas.md`, and typing content creates a pending new file.
- Clicking "Edit" on an existing markdown file opens the split-pane editor with live preview.
- Changes in the editor are reflected in the preview in real time.
- Clicking "Delete" and confirming marks the file as pending deletion.
- No changes are written to disk until the user commits (see 3.12).

---

### 3.11 File Management

#### Move / Rename

- Right-click (or action menu) on a file provides a "Move / Rename" option.
- Opens a dialog pre-filled with the current path; the user edits the path.
- The move is tracked as a pending change (delete old + create new).

#### Create Directory

- A "New Folder" button in the sidebar allows creating an empty directory.
- Directories are only persisted to git if they contain at least one file (git does not track empty directories).

#### Drag-and-Drop (nice-to-have)

- Files can be dragged within the sidebar to move them between directories.

#### Acceptance Criteria

- Renaming `old.md` to `new.md` creates a pending change showing the move.
- Moving `docs/a.md` to `guides/a.md` is tracked as a pending delete + create.
- Creating a new folder appears immediately in the sidebar.

---

### 3.12 Git Staging & Commit

All create, edit, delete, and move operations are tracked as **pending changes** before being committed.

#### Pending Changes Indicator

- The top bar shows a badge with the count of pending changed files (e.g., "3 changes").
- Clicking the badge opens the **Review Changes** panel.

#### Review Changes Panel

- Lists all pending changes grouped by type: created, modified, deleted, moved.
- Each entry shows a diff (added/removed lines for text files).
- Individual changes can be discarded (reverted).

#### Commit

- A "Commit" button opens a dialog with a text field for the commit message.
- Submitting the dialog:
  - Writes all pending changes to disk.
  - Stages them with `git add` / `git rm`.
  - Creates a `git commit` with the provided message.
- After a successful commit, the pending changes list is cleared and the dirty indicator updates.

#### Acceptance Criteria

- After editing two files and deleting one, the badge shows "3 changes".
- The Review Changes panel shows diffs for each modified file.
- Discarding a single change removes it from pending and reverts the file.
- Committing with message "Update docs" creates a git commit with that message containing exactly the pending changes.
- After commit, the badge disappears and the dirty indicator shows clean (if no other uncommitted work exists).

---

### 3.13 Search

#### File Name Search

- A search input in the sidebar provides fuzzy file-name matching.
- Results update as the user types (debounced).
- Selecting a result navigates to that file.

#### Full-Text Search

- A separate search mode (or toggle) searches file contents across the entire repo.
- Results show: file path, matching line number(s), and a snippet of surrounding context (2-3 lines).
- Clicking a result navigates to the file and scrolls to the matching line.

#### Acceptance Criteria

- Typing "setu" in the file search matches `docs/setup.md`.
- Full-text searching for "install" returns all files containing that word, with line numbers and context.
- Clicking a full-text result opens the file and scrolls to the match.

---

### 3.14 Theming

#### Light / Dark Mode

- A toggle in the top bar switches between light and dark themes.
- The default follows the user's system preference (`prefers-color-scheme`).
- The user's choice is persisted in `localStorage`.

#### Custom CSS (nice-to-have)

- A configuration option to load a custom CSS file for overriding default styles.

#### Acceptance Criteria

- Opening giki on a system set to dark mode defaults to the dark theme.
- Clicking the toggle switches to light mode and persists the choice across page reloads.
- A custom CSS file can override colors and fonts.

---

### 3.15 API-Based Remote Browsing

Browse remote repositories via GitHub/GitLab APIs without cloning to disk.

#### Behavior

- `giki https://github.com/org/repo` fetches the file tree and file contents via the GitHub API (or GitLab API).
- No local clone is created.
- Browsing is read-only (editing requires cloning or authentication).

#### Authentication

- Unauthenticated by default (subject to API rate limits).
- Optional: provide a personal access token via `--token` flag, config file, or environment variable to increase rate limits and access private repos.

#### Caching

- API responses are cached in memory for the duration of the session.
- Switching branches invalidates the cache for that branch's tree.

#### Acceptance Criteria

- `giki https://github.com/org/public-repo` opens the wiki without cloning, using API calls.
- File tree and file contents load correctly for public repos without a token.
- Providing a token allows browsing private repos.
- Navigating back to a previously viewed file loads instantly from cache.
- Rate-limit errors display a user-friendly message suggesting token authentication.

---

### 3.16 Authentication & Configuration

#### Supported Credential Types

- **SSH keys** — for `git clone` and `git push` over SSH.
- **Personal Access Tokens (PATs)** — for HTTPS git operations and API access.

#### Configuration

- Config file at `~/.config/giki/config.toml`:
  ```toml
  [github]
  token = "ghp_..."

  [gitlab]
  token = "glpat-..."
  ```
- Environment variables: `GIKI_GITHUB_TOKEN`, `GIKI_GITLAB_TOKEN`.
- CLI flags override config file; config file overrides environment variables.

#### Acceptance Criteria

- A PAT in the config file is used for API requests and HTTPS clones.
- An environment variable is used when no config file entry exists.
- A `--token` CLI flag overrides both config and environment.

---

## 4. API / Internal Endpoints

Giki exposes internal JSON endpoints under `/api/`. All non-`/api/` paths serve rendered HTML pages.

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/api/tree?branch=<branch>` | GET | File tree for the given branch | JSON tree structure with name, path, type (file/dir), and children |
| `/api/file/<path>?branch=<branch>` | GET | Raw file content | Raw bytes with appropriate `Content-Type` |
| `/api/branches` | GET | List of local branches | JSON array of branch names with a `default` flag |
| `/api/status` | GET | Repo metadata | JSON: `{ source, branch, dirty }` |

#### Notes

- `branch` query parameter defaults to the repo's HEAD branch if omitted.
- `/api/file/` returns raw content so the frontend can handle rendering.
- Non-API paths (`/`, `/docs/setup.md`, etc.) return the SPA HTML shell; the client fetches data via the API endpoints.

---

## 5. Distribution

| Channel | Command / Method |
|---------|-----------------|
| **Homebrew** | `brew install buckleypaul/tap/giki` via the `buckleypaul/homebrew-tap` tap |
| **Goreleaser** | Cross-platform binaries for macOS (arm64, amd64), Linux (arm64, amd64), and Windows (amd64) |
| **Single binary** | No runtime dependencies — static assets embedded in the binary |

---

## 6. Architecture Notes

- **Language**: Go.
- **Static assets**: Embedded via `embed.FS` — HTML, CSS, JS bundled into the binary at compile time.
- **Git operations**: Local git via go-git (pure Go) or shelling out to the git CLI. Abstracted behind a provider interface designed for extension to multiple backends (local, GitHub API, GitLab API).
- **Markdown rendering**: Server-side with goldmark (or similar Go library) or client-side with marked.js / remark. Decision deferred to implementation.
- **Frontend**: SPA with client-side routing for smooth, reload-free navigation between files.
- **File watching** (nice-to-have): fsnotify for detecting working-tree changes; push updates to the browser via WebSocket or SSE.
