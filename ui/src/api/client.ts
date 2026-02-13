// API client for Giki backend endpoints
// All requests go to /api/* which is proxied to Go server in dev mode
// and served by Go server directly in production

import type { TreeNode, BranchInfo, RepoStatus } from './types';

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
