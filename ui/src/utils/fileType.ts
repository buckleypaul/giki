/**
 * File type categorization for rendering different file types
 */

export type FileType = 'markdown' | 'code' | 'image' | 'binary' | 'unknown';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.go', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.php', '.swift', '.kt', '.rs', '.scala', '.sh', '.bash', '.zsh', '.fish',
  '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.toml',
  '.sql', '.r', '.m', '.vim', '.lua', '.pl', '.pm', '.tcl', '.awk', '.sed', '.makefile',
  '.dockerfile', '.tf', '.hcl', '.proto', '.thrift', '.gradle', '.groovy', '.clj', '.cljs',
  '.ex', '.exs', '.erl', '.hrl', '.ml', '.mli', '.fs', '.fsx', '.jl', '.nim', '.zig',
  '.v', '.sv', '.vhd', '.vhdl', '.asm', '.s', '.lisp', '.scm', '.rkt', '.el', '.d', '.dart'
];

const IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif'
];

const BINARY_EXTENSIONS = [
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.dmg', '.iso', '.exe', '.dll',
  '.so', '.dylib', '.a', '.o', '.obj', '.bin', '.dat', '.db', '.sqlite', '.pdf', '.doc',
  '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4a', '.ogg', '.wav', '.flac'
];

/**
 * Get file extension from path (includes the dot, lowercased)
 */
function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = path.lastIndexOf('/');

  // No extension or dot is part of directory name
  if (lastDot === -1 || lastDot < lastSlash) {
    return '';
  }

  return path.slice(lastDot).toLowerCase();
}

/**
 * Categorize a file by its path/extension
 */
export function getFileType(path: string): FileType {
  const ext = getExtension(path);

  if (!ext) {
    return 'unknown';
  }

  if (MARKDOWN_EXTENSIONS.includes(ext)) {
    return 'markdown';
  }

  if (CODE_EXTENSIONS.includes(ext)) {
    return 'code';
  }

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }

  if (BINARY_EXTENSIONS.includes(ext)) {
    return 'binary';
  }

  return 'unknown';
}

/**
 * Get programming language name from file extension for syntax highlighting
 * Returns empty string if language cannot be determined
 */
export function getLanguageFromExtension(path: string): string {
  const ext = getExtension(path);

  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.go': 'go',
    '.py': 'python',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.rs': 'rust',
    '.scala': 'scala',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.fish': 'bash',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.sql': 'sql',
    '.r': 'r',
    '.m': 'objectivec',
    '.vim': 'vim',
    '.lua': 'lua',
    '.pl': 'perl',
    '.pm': 'perl',
    '.dockerfile': 'dockerfile',
    '.makefile': 'makefile',
    '.proto': 'protobuf',
    '.gradle': 'gradle',
    '.groovy': 'groovy',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.erl': 'erlang',
    '.ml': 'ocaml',
    '.fs': 'fsharp',
    '.jl': 'julia',
    '.dart': 'dart',
  };

  return languageMap[ext] || '';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
