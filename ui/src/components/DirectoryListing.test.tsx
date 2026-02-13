import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DirectoryListing } from './DirectoryListing';
import type { TreeNode } from '../api/types';

describe('DirectoryListing', () => {
  const mockChildren: TreeNode[] = [
    { name: 'file1.md', path: 'docs/file1.md', isDir: false },
    { name: 'subdir', path: 'docs/subdir', isDir: true, children: [] },
    { name: 'file2.go', path: 'docs/file2.go', isDir: false },
    { name: 'another-dir', path: 'docs/another-dir', isDir: true, children: [] },
  ];

  it('renders directory path in heading', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /directory:.*\/docs/i })).toBeInTheDocument();
  });

  it('renders root directory as /', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="" children={mockChildren} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'Directory: /' })).toBeInTheDocument();
  });

  it('renders all children as links', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /file1.md/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /file2.go/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /subdir/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /another-dir/ })).toBeInTheDocument();
  });

  it('sorts directories before files', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    const links = screen.getAllByRole('link');
    const linkTexts = links.map((link) => link.textContent);

    // Directories should come first
    const dirIndex1 = linkTexts.findIndex((text) => text?.includes('another-dir'));
    const dirIndex2 = linkTexts.findIndex((text) => text?.includes('subdir'));
    const fileIndex1 = linkTexts.findIndex((text) => text?.includes('file1.md'));
    const fileIndex2 = linkTexts.findIndex((text) => text?.includes('file2.go'));

    expect(dirIndex1).toBeLessThan(fileIndex1);
    expect(dirIndex2).toBeLessThan(fileIndex1);
    expect(dirIndex1).toBeLessThan(fileIndex2);
    expect(dirIndex2).toBeLessThan(fileIndex2);
  });

  it('renders directories with trailing slash in text', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    const subdirLink = screen.getByRole('link', { name: /subdir/ });
    expect(subdirLink.textContent).toMatch(/subdir\/$/);
  });

  it('renders correct href for nested paths', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    const fileLink = screen.getByRole('link', { name: /file1.md/ });
    expect(fileLink).toHaveAttribute('href', '/docs/file1.md');

    const dirLink = screen.getByRole('link', { name: /subdir/ });
    expect(dirLink).toHaveAttribute('href', '/docs/subdir');
  });

  it('renders empty directory', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="empty" children={[]} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /directory:.*\/empty/i })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('displays no README message', () => {
    render(
      <BrowserRouter>
        <DirectoryListing path="docs" children={mockChildren} />
      </BrowserRouter>
    );

    expect(screen.getByText(/does not contain a readme.md/i)).toBeInTheDocument();
  });
});
