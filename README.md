# Giki

Turn any git repository into a browsable wiki in the browser.

Giki is a CLI tool that combines a Go backend with a React frontend to provide a beautiful, read-only interface for exploring git repositories. Browse files, view markdown with GitHub Flavored Markdown rendering, syntax-highlighted code, images, and switch between branches - all from your browser.

## Features

- **Local Repository Browsing**: Point giki at any local git repository
- **GitHub Flavored Markdown**: Full GFM support with syntax highlighting
- **Code Syntax Highlighting**: Over 180 languages supported
- **Image Display**: View images directly in the browser
- **Branch Switching**: Navigate between branches via dropdown
- **File Tree Navigation**: Collapsible file tree with directory support
- **URL Routing**: Shareable URLs for specific files and directories
- **Single Binary**: No runtime dependencies - just one executable

## Installation

### Homebrew (macOS/Linux)

```bash
brew install buckleypaul/tap/giki
```

### Direct Download

Download the latest release for your platform from the [releases page](https://github.com/buckleypaul/giki/releases).

### From Source

Requires Go 1.25+ and Node.js 20+:

```bash
git clone https://github.com/buckleypaul/giki.git
cd giki
make build
./giki
```

## Usage

### Browse Current Directory

```bash
giki
```

### Browse Specific Repository

```bash
giki /path/to/repo
```

### Custom Port

```bash
giki --port 8080
```

### Specific Branch

```bash
giki --branch develop
```

### Full Options

```bash
giki [path] [flags]

Flags:
  -b, --branch string   Branch to browse (defaults to HEAD)
  -p, --port int        Port to run the server on (default 4242)
  -h, --help            Help for giki
```

## How It Works

Giki starts a local web server and opens your default browser to `http://localhost:4242`. The server reads your repository using [go-git](https://github.com/go-git/go-git) and serves a React single-page application.

For the current/HEAD branch, files are read from the working tree (uncommitted changes are visible). For other branches, files are read from git's object store (committed state only).

## Development

### Prerequisites

- Go 1.25+
- Node.js 20+
- Make

### Running in Development Mode

Run two terminals concurrently:

```bash
# Terminal 1: Frontend dev server (port 5173)
make frontend-dev

# Terminal 2: Go server in dev mode (port 4242)
make dev
```

In dev mode, the Go server proxies non-API requests to Vite's dev server for hot module reloading.

### Running Tests

```bash
# Go tests
make test

# Frontend tests
cd ui && npm test
```

### Building

```bash
make build
```

This builds the frontend to `ui/dist/`, embeds it into the Go binary, and produces a single `giki` executable.

## Architecture

- **Backend**: Go with [Cobra](https://github.com/spf13/cobra) CLI and [go-git](https://github.com/go-git/go-git)
- **Frontend**: React + TypeScript with Vite
- **Routing**: React Router for client-side navigation
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-highlight`
- **Embedding**: Frontend bundled into Go binary via `embed.FS`

See [architecture.md](architecture.md) for detailed architectural documentation.

## Roadmap

Current version (v0.1.0) provides read-only browsing. Planned features:

- **Editing**: In-browser file editing with syntax highlighting
- **Committing**: Create commits directly from the browser
- **Remote Repositories**: Clone and browse remote repos (GitHub, GitLab, etc.)
- **Search**: Full-text search across repository
- **Themes**: Dark mode and custom themes

See [plan.md](plan.md) for the full implementation roadmap.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

This project is currently in active development. Issues and pull requests are welcome!

## Credits

Built by [Paul Buckley](https://github.com/buckleypaul) with assistance from Claude Code.
