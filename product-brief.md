# Giki — Product Brief

## Overview

Giki is a Go CLI tool that renders any git repository as a browsable wiki in your browser. Point it at a local repo or a remote GitHub/GitLab URL, and giki launches a local web server serving the repository's contents as navigable, rendered markdown pages with a file explorer sidebar — turning any repo into an instant, read-only wiki.

## CLI Interface

```
giki .                              # serve current directory
giki /path/to/repo                  # serve a local repo
giki https://github.com/org/repo    # browse a remote repo via API
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port`, `-p` | `4242` | Port for the local web server |
| `--branch`, `-b` | default branch | Branch to display |

## UI Layout

The browser UI is a three-zone layout:

- **Top bar** — Shows the repo source (local path or remote URL), current branch, and a modified/dirty indicator for local repos.
- **Sidebar** — Collapsible file tree for navigating the repository. Directories expand/collapse in place. Clicking a file loads it in the main content area.
- **Main content area** — Renders markdown files with full formatting. Relative links between markdown files navigate within giki. Non-markdown files display as syntax-highlighted source.

## Features

### Browsing & Navigation

- **File explorer sidebar** — Tree navigation with expand/collapse directories
- **Markdown rendering** — Full markdown support; relative links between files navigate within the wiki
- **Top status bar** — Displays source (path or URL), current branch, and dirty/clean state for local repos
- **Local repo support** — `giki .` or `giki /path/to/repo` serves a local git repository
- **Remote repo support** — `giki https://github.com/org/repo` clones the repo locally, then serves the clone (all local features apply)
- **Branch selection** — Switch between branches via `--branch` flag or in-browser branch picker

### Editing & Management

- **Create/edit/delete pages** — In-browser markdown editor for creating new files, editing existing ones, or deleting pages
- **File management** — Move files and create folders from the UI
- **Local staging & commit** — All changes are staged locally; a "Commit" button writes them as a git commit
- **Search** — File name fuzzy search and full-text content search across the repo
- **Theming** — Customizable appearance and theme support
- **API-based remote browsing** — Browse remote repos via GitHub/GitLab APIs without cloning
- **Authentication** — SSH key and personal access token (PAT) support for pushing changes and API access

## Distribution

- **Homebrew** — `brew install buckleypaul/tap/giki` via the `buckleypaul/homebrew-tap` tap
- **Single binary** — Built and released as a standalone Go binary using goreleaser, with cross-platform support (macOS, Linux, Windows)

## Architecture Notes

- **Go binary** with an embedded HTTP server serving static assets (HTML/CSS/JS bundled into the binary)
- **Git provider abstraction** — A common interface over GitHub API, GitLab API, and local git operations, so the UI layer doesn't care where the repo lives
- **Local git operations** — Via go-git (pure Go) or shelling out to the git CLI
- **Remote repo access** — Supports both cloning locally and API-based fetching of file trees and content (no cloning required)
