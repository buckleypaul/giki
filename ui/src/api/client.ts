// API client for Giki backend endpoints
// All requests go to /api/* which is proxied to Go server in dev mode
// and served by Go server directly in production

import type { TreeNode, BranchInfo, RepoStatus, SearchResult } from './types';

/**
 * Fetches the file tree for the specified branch
 * @param branch - Optional branch name (defaults to current/HEAD)
 */
export async function fetchTree(branch?: string): Promise<TreeNode> {
  const url = branch ? `/api/tree?branch=${encodeURIComponent(branch)}` : '/api/tree';
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch tree: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the content of a file at the specified path
 * @param path - File path relative to repository root
 * @param branch - Optional branch name (defaults to current/HEAD)
 */
export async function fetchFile(path: string, branch?: string): Promise<string> {
  const url = branch
    ? `/api/file/${path}?branch=${encodeURIComponent(branch)}`
    : `/api/file/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Fetches all branches in the repository
 */
export async function fetchBranches(): Promise<BranchInfo[]> {
  const response = await fetch('/api/branches');

  if (!response.ok) {
    throw new Error(`Failed to fetch branches: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the current repository status (source, branch, dirty state)
 */
export async function fetchStatus(): Promise<RepoStatus> {
  const response = await fetch('/api/status');

  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Writes a file to disk
 * @param path - File path relative to repository root
 * @param content - File content to write
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const response = await fetch('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to write file: ${error.error || response.statusText}`);
  }
}

/**
 * Deletes a file from disk
 * @param path - File path relative to repository root
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch('/api/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to delete file: ${error.error || response.statusText}`);
  }
}

/**
 * Moves or renames a file
 * @param oldPath - Current file path
 * @param newPath - New file path
 */
export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  const response = await fetch('/api/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPath, newPath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to move file: ${error.error || response.statusText}`);
  }
}

/**
 * Creates a git commit with the specified message
 * @param message - Commit message
 * @returns Commit hash
 */
export async function commitChanges(message: string): Promise<{ hash: string }> {
  const response = await fetch('/api/commit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to commit changes: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Performs a search query
 * @param query - Search query string
 * @param type - Search type: 'filename' for fuzzy filename matching, 'content' for full-text search
 * @returns Array of search results
 */
export async function search(
  query: string,
  type: 'filename' | 'content'
): Promise<SearchResult[]> {
  const url = `/api/search?q=${encodeURIComponent(query)}&type=${type}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  // For filename search, response is string[]
  // For content search, response is SearchResult[]
  if (type === 'filename') {
    const paths: string[] = await response.json();
    return paths.map((path) => ({ path }));
  }

  return response.json();
}
