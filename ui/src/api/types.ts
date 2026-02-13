// TypeScript types matching the Go backend API responses

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
}

export interface RepoStatus {
  source: string;
  branch: string;
  isDirty: boolean;
}
