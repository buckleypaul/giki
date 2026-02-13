import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContentArea from './ContentArea';
import * as apiClient from '../api/client';
import type { TreeNode } from '../api/types';

// Mock the API client
vi.mock('../api/client');
const fetchFileMock = vi.mocked(apiClient.fetchFile);
const fetchTreeMock = vi.mocked(apiClient.fetchTree);

// Mock child components
vi.mock('./FileViewer', () => ({
  FileViewer: ({ filePath }: { filePath: string }) => (
    <div data-testid="file-viewer">FileViewer: {filePath}</div>
  ),
}));

vi.mock('./DirectoryListing', () => ({
  DirectoryListing: ({ path }: { path: string }) => (
    <div data-testid="directory-listing">DirectoryListing: {path}</div>
  ),
}));

vi.mock('./NotFound', () => ({
  NotFound: ({ path }: { path: string }) => (
    <div data-testid="not-found">NotFound: {path}</div>
  ),
}));

describe('ContentArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    fetchFileMock.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter initialEntries={['/']}>
        <ContentArea />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders README.md at root path when it exists', async () => {
    fetchFileMock.mockResolvedValue('# Hello');

    render(
      <MemoryRouter initialEntries={['/']}>
        <ContentArea />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
    });

    expect(screen.getByText(/FileViewer: README.md/)).toBeInTheDocument();
    expect(fetchFileMock).toHaveBeenCalledWith('README.md', undefined);
  });

  it('renders empty state at root when README.md does not exist', async () => {
    fetchFileMock.mockRejectedValue(new Error('File not found'));

    render(
      <MemoryRouter initialEntries={['/']}>
        <ContentArea />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/does not contain a readme.md/i)).toBeInTheDocument();
    });
  });

  it('renders FileViewer for existing file', async () => {
    fetchFileMock.mockResolvedValue('# Content');

    render(
      <MemoryRouter initialEntries={['/docs/guide.md']}>
        <ContentArea />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
    });

    expect(screen.getByText(/FileViewer: docs\/guide.md/)).toBeInTheDocument();
    expect(fetchFileMock).toHaveBeenCalledWith('docs/guide.md', undefined);
  });

  it('renders NotFound for nonexistent file', async () => {
    fetchFileMock.mockRejectedValue(new Error('File not found'));
    fetchTreeMock.mockRejectedValue(new Error('Tree error'));

    render(
      <MemoryRouter initialEntries={['/nonexistent.md']}>
        <ContentArea />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });

    expect(screen.getByText(/NotFound: \/nonexistent.md/)).toBeInTheDocument();
  });

  it('renders DirectoryListing for directory without README', async () => {
    const mockTree: TreeNode = {
      name: '',
      path: '',
      isDir: true,
      children: [
        {
          name: 'docs',
          path: 'docs',
          isDir: true,
          children: [
            { name: 'file1.md', path: 'docs/file1.md', isDir: false },
            { name: 'file2.md', path: 'docs/file2.md', isDir: false },
          ],
        },
      ],
    };

    // First call for file lookup fails
    fetchFileMock.mockRejectedValueOnce(new Error('File not found'));
    // Second call for README in directory fails
    fetchFileMock.mockRejectedValueOnce(new Error('File not found'));
    // Tree fetch succeeds
    fetchTreeMock.mockResolvedValue(mockTree);

    render(
      <MemoryRouter initialEntries={['/docs']}>
        <ContentArea />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('directory-listing')).toBeInTheDocument();
    });

    expect(screen.getByText(/DirectoryListing: docs/)).toBeInTheDocument();
  });

  it('passes branch parameter to API calls', async () => {
    fetchFileMock.mockResolvedValue('# Content');

    render(
      <MemoryRouter initialEntries={['/file.md']}>
        <ContentArea branch="dev" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchFileMock).toHaveBeenCalledWith('file.md', 'dev');
    });
  });

  it('re-fetches content when branch changes', async () => {
    fetchFileMock.mockResolvedValue('# Content');

    const { rerender } = render(
      <MemoryRouter initialEntries={['/file.md']}>
        <ContentArea branch="main" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchFileMock).toHaveBeenCalledWith('file.md', 'main');
    });

    // Clear mocks
    fetchFileMock.mockClear();

    // Change branch
    rerender(
      <MemoryRouter initialEntries={['/file.md']}>
        <ContentArea branch="dev" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchFileMock).toHaveBeenCalledWith('file.md', 'dev');
    });
  });
});
