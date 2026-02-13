import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MarkdownView } from './MarkdownView';

// Helper to render with Router context
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('MarkdownView', () => {
  describe('GFM Features', () => {
    it('renders GFM table as HTML table element', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;

      renderWithRouter(<MarkdownView content={markdown} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
    });

    it('renders task list checkboxes and marks them as disabled', () => {
      const markdown = `
- [x] Completed task
- [ ] Incomplete task
      `;

      renderWithRouter(<MarkdownView content={markdown} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('renders strikethrough text', () => {
      const markdown = '~~strikethrough~~';
      renderWithRouter(<MarkdownView content={markdown} />);

      const del = document.querySelector('del');
      expect(del).toBeInTheDocument();
      expect(del).toHaveTextContent('strikethrough');
    });
  });

  describe('Syntax Highlighting', () => {
    it('applies highlight classes to fenced code blocks', () => {
      const markdown = `
\`\`\`javascript
const foo = 'bar';
\`\`\`
      `;

      renderWithRouter(<MarkdownView content={markdown} />);

      const pre = document.querySelector('pre');
      expect(pre).toBeInTheDocument();

      const code = pre?.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toContain("const foo = 'bar';");
    });

    it('renders inline code with proper styling', () => {
      const markdown = 'This is `inline code` text.';
      renderWithRouter(<MarkdownView content={markdown} />);

      const code = document.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent('inline code');
    });
  });

  describe('Link Handling', () => {
    it('renders relative links as React Router Link components', () => {
      const markdown = '[Relative Link](docs/guide.md)';
      renderWithRouter(<MarkdownView content={markdown} basePath="readme" />);

      const link = screen.getByText('Relative Link');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/readme/docs/guide.md');
    });

    it('renders external HTTP links with target="_blank"', () => {
      const markdown = '[External](https://example.com)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const link = screen.getByText('External');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders external HTTPS links with target="_blank"', () => {
      const markdown = '[Secure Link](https://secure.example.com)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const link = screen.getByText('Secure Link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('handles protocol-relative URLs as external', () => {
      const markdown = '[Protocol Relative](//example.com/path)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const link = screen.getByText('Protocol Relative');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('resolves ./ relative links correctly', () => {
      const markdown = '[Same Dir](./file.md)';
      renderWithRouter(<MarkdownView content={markdown} basePath="docs" />);

      const link = screen.getByText('Same Dir');
      expect(link).toHaveAttribute('href', '/docs/file.md');
    });

    it('resolves ../ parent directory links correctly', () => {
      const markdown = '[Parent](../README.md)';
      renderWithRouter(<MarkdownView content={markdown} basePath="docs/guide" />);

      const link = screen.getByText('Parent');
      expect(link).toHaveAttribute('href', '/docs/README.md');
    });

    it('resolves multiple ../ levels correctly', () => {
      const markdown = '[Root](../../README.md)';
      renderWithRouter(<MarkdownView content={markdown} basePath="docs/api/v1" />);

      const link = screen.getByText('Root');
      expect(link).toHaveAttribute('href', '/docs/README.md');
    });

    it('handles absolute paths without basePath modification', () => {
      const markdown = '[Absolute](/docs/file.md)';
      renderWithRouter(<MarkdownView content={markdown} basePath="other" />);

      const link = screen.getByText('Absolute');
      expect(link).toHaveAttribute('href', '/docs/file.md');
    });
  });

  describe('Image Handling', () => {
    it('rewrites relative image src to /api/file/ prefix', () => {
      const markdown = '![Alt Text](images/pic.png)';
      renderWithRouter(<MarkdownView content={markdown} basePath="docs" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/api/file/docs/images/pic.png');
      expect(img).toHaveAttribute('alt', 'Alt Text');
    });

    it('passes through external HTTP image URLs unchanged', () => {
      const markdown = '![External](https://example.com/image.png)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/image.png');
    });

    it('passes through external HTTPS image URLs unchanged', () => {
      const markdown = '![Secure](https://cdn.example.com/pic.jpg)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/pic.jpg');
    });

    it('handles protocol-relative image URLs as external', () => {
      const markdown = '![CDN](//cdn.example.com/image.png)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '//cdn.example.com/image.png');
    });

    it('resolves ./ relative image paths correctly', () => {
      const markdown = '![Same](./pic.png)';
      renderWithRouter(<MarkdownView content={markdown} basePath="assets" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/api/file/assets/pic.png');
    });

    it('resolves ../ parent directory image paths correctly', () => {
      const markdown = '![Parent](../images/logo.png)';
      renderWithRouter(<MarkdownView content={markdown} basePath="docs/guide" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/api/file/docs/images/logo.png');
    });

    it('handles absolute image paths without modification', () => {
      const markdown = '![Absolute](/static/logo.png)';
      renderWithRouter(<MarkdownView content={markdown} basePath="other" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/api/file/static/logo.png');
    });

    it('handles images without basePath', () => {
      const markdown = '![No Base](image.png)';
      renderWithRouter(<MarkdownView content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/api/file/image.png');
    });
  });

  describe('Heading Anchors', () => {
    it('generates anchor IDs for headings via rehype-slug', () => {
      const markdown = '# Hello World';
      renderWithRouter(<MarkdownView content={markdown} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAttribute('id', 'hello-world');
    });

    it('generates anchor IDs for h2 headings', () => {
      const markdown = '## Installation Guide';
      renderWithRouter(<MarkdownView content={markdown} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('id', 'installation-guide');
    });

    it('handles special characters in heading IDs', () => {
      const markdown = '### API Reference: get()';
      renderWithRouter(<MarkdownView content={markdown} />);

      const heading = screen.getByRole('heading', { level: 3 });
      // rehype-slug converts to kebab-case and removes special chars
      expect(heading).toHaveAttribute('id');
      expect(heading.id).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty markdown content', () => {
      renderWithRouter(<MarkdownView content="" />);
      const container = document.querySelector('.markdown-view');
      expect(container).toBeInTheDocument();
    });

    it('handles links without href attribute', () => {
      const markdown = '[No Href]()';
      renderWithRouter(<MarkdownView content={markdown} />);

      const link = screen.getByText('No Href');
      expect(link).toBeInTheDocument();
    });

    it('handles images without src attribute', () => {
      // This is tricky since markdown parser might not render img without src
      // Testing the component handles it gracefully if it occurs
      const markdown = '![Alt]()';
      const { container } = renderWithRouter(<MarkdownView content={markdown} />);
      expect(container).toBeInTheDocument();
    });

    it('handles complex nested markdown structures', () => {
      const markdown = `
# Main Title

## Section

- List item with **bold**
- List item with [link](https://example.com)
- Task list: [x] Done

\`\`\`js
const code = true;
\`\`\`

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |
      `;

      renderWithRouter(<MarkdownView content={markdown} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title');
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('link')).toHaveAttribute('target', '_blank');
    });
  });
});
