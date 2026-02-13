import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FileViewer } from './FileViewer';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  fetchFile: vi.fn(),
}));

// Mock child components to simplify testing
vi.mock('./MarkdownView', () => ({
  MarkdownView: ({ content }: { content: string }) => (
    <div data-testid="markdown-view">{content}</div>
  ),
}));

vi.mock('./CodeView', () => ({
  CodeView: ({ content, filePath }: { content: string; filePath: string }) => (
    <div data-testid="code-view">
      {filePath}: {content}
    </div>
  ),
}));

vi.mock('./ImageView', () => ({
  ImageView: ({ filePath }: { filePath: string }) => (
    <div data-testid="image-view">{filePath}</div>
  ),
}));

vi.mock('./BinaryCard', () => ({
  BinaryCard: ({ filePath }: { filePath: string }) => (
    <div data-testid="binary-card">{filePath}</div>
  ),
}));

describe('FileViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(apiClient.fetchFile).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<FileViewer filePath="test.md" />);
    expect(screen.getByText(/Loading test.md/)).toBeInTheDocument();
  });

  it('renders MarkdownView for .md files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('# Hello World');

    render(<FileViewer filePath="README.md" />);

    await waitFor(() => {
      expect(screen.getByTestId('markdown-view')).toBeInTheDocument();
      expect(screen.getByText('# Hello World')).toBeInTheDocument();
    });
  });

  it('renders CodeView for .go files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('package main');

    render(<FileViewer filePath="main.go" />);

    await waitFor(() => {
      expect(screen.getByTestId('code-view')).toBeInTheDocument();
      expect(screen.getByText(/main.go: package main/)).toBeInTheDocument();
    });
  });

  it('renders ImageView for .png files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('fake-image-data');

    render(<FileViewer filePath="logo.png" />);

    await waitFor(() => {
      expect(screen.getByTestId('image-view')).toBeInTheDocument();
      expect(screen.getByText('logo.png')).toBeInTheDocument();
    });
  });

  it('renders BinaryCard for .zip files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('binary-content');

    render(<FileViewer filePath="archive.zip" />);

    await waitFor(() => {
      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
      expect(screen.getByText('archive.zip')).toBeInTheDocument();
    });
  });

  it('renders CodeView for unknown text files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('plain text content');

    render(<FileViewer filePath="LICENSE" />);

    await waitFor(() => {
      expect(screen.getByTestId('code-view')).toBeInTheDocument();
    });
  });

  it('renders BinaryCard for unknown binary files', async () => {
    // Simulate binary content with null bytes
    vi.mocked(apiClient.fetchFile).mockResolvedValue('binary\0content\0data');

    render(<FileViewer filePath="unknown.dat" />);

    await waitFor(() => {
      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(apiClient.fetchFile).mockRejectedValue(new Error('File not found'));

    render(<FileViewer filePath="missing.md" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: File not found/)).toBeInTheDocument();
    });
  });

  it('passes branch parameter to fetchFile', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('content');

    render(<FileViewer filePath="test.md" branch="dev" />);

    await waitFor(() => {
      expect(apiClient.fetchFile).toHaveBeenCalledWith('test.md', 'dev');
    });
  });

  it('calculates correct basePath for nested files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('# Title');

    const { container } = render(<FileViewer filePath="docs/guide/intro.md" />);

    await waitFor(() => {
      const markdownView = container.querySelector('[data-testid="markdown-view"]');
      expect(markdownView).toBeInTheDocument();
    });
  });

  it('uses empty basePath for root-level files', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('# Title');

    const { container } = render(<FileViewer filePath="README.md" />);

    await waitFor(() => {
      const markdownView = container.querySelector('[data-testid="markdown-view"]');
      expect(markdownView).toBeInTheDocument();
    });
  });

  it('refetches when filePath changes', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('content 1');

    const { rerender } = render(<FileViewer filePath="file1.md" />);

    await waitFor(() => {
      expect(apiClient.fetchFile).toHaveBeenCalledWith('file1.md', undefined);
    });

    vi.mocked(apiClient.fetchFile).mockResolvedValue('content 2');

    rerender(<FileViewer filePath="file2.md" />);

    await waitFor(() => {
      expect(apiClient.fetchFile).toHaveBeenCalledWith('file2.md', undefined);
    });

    expect(apiClient.fetchFile).toHaveBeenCalledTimes(2);
  });

  it('refetches when branch changes', async () => {
    vi.mocked(apiClient.fetchFile).mockResolvedValue('content');

    const { rerender } = render(<FileViewer filePath="test.md" branch="main" />);

    await waitFor(() => {
      expect(apiClient.fetchFile).toHaveBeenCalledWith('test.md', 'main');
    });

    rerender(<FileViewer filePath="test.md" branch="dev" />);

    await waitFor(() => {
      expect(apiClient.fetchFile).toHaveBeenCalledWith('test.md', 'dev');
    });

    expect(apiClient.fetchFile).toHaveBeenCalledTimes(2);
  });
});
