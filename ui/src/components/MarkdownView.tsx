import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Link } from 'react-router-dom';
import type { Components } from 'react-markdown';
import './MarkdownView.css';

interface MarkdownViewProps {
  content: string;
  basePath?: string;
}

/**
 * Determines if a URL is external (has protocol or starts with //)
 */
function isExternalUrl(url: string): boolean {
  return url.includes('://') || url.startsWith('//');
}

/**
 * Resolves a relative path based on the current file's directory
 * @param href - The relative or absolute path
 * @param basePath - The directory of the current file (e.g., "docs/guide")
 * @returns Resolved path
 */
function resolveRelativePath(href: string, basePath?: string): string {
  // If href is absolute (starts with /), return as-is
  if (href.startsWith('/')) {
    return href;
  }

  // Remove leading ./ if present
  const cleanHref = href.startsWith('./') ? href.slice(2) : href;

  // If no basePath, just prepend /
  if (!basePath) {
    return `/${cleanHref}`;
  }

  // Handle ../ navigation
  if (cleanHref.startsWith('../')) {
    const baseSegments = basePath.split('/').filter(s => s);
    const hrefSegments = cleanHref.split('/');

    let upCount = 0;
    for (const segment of hrefSegments) {
      if (segment === '..') {
        upCount++;
      } else {
        break;
      }
    }

    const remainingBase = baseSegments.slice(0, -upCount);
    const remainingHref = hrefSegments.slice(upCount);

    return '/' + [...remainingBase, ...remainingHref].join('/');
  }

  // Simple relative path - append to basePath
  return `/${basePath}/${cleanHref}`;
}

/**
 * MarkdownView component that renders markdown with GFM support,
 * syntax highlighting, and custom handling for links and images.
 */
export function MarkdownView({ content, basePath }: MarkdownViewProps) {
  const components: Components = {
    // Custom link component: relative links use React Router, external open in new tab
    a: ({ node, href, children, ...props }) => {
      if (!href) {
        return <a {...props}>{children}</a>;
      }

      // External links open in new tab
      if (isExternalUrl(href)) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      }

      // Relative links use React Router for SPA navigation
      const resolvedPath = resolveRelativePath(href, basePath);
      return (
        <Link to={resolvedPath} {...props}>
          {children}
        </Link>
      );
    },

    // Custom image component: rewrite relative src to /api/file/<path>
    img: ({ node, src, alt, ...props }) => {
      if (!src) {
        return <img alt={alt} {...props} />;
      }

      // External images pass through as-is
      if (isExternalUrl(src)) {
        return <img src={src} alt={alt} {...props} />;
      }

      // Relative images: rewrite to /api/file/<path>
      const resolvedPath = resolveRelativePath(src, basePath);
      const apiUrl = `/api/file${resolvedPath}`;

      return <img src={apiUrl} alt={alt} {...props} />;
    },

    // Ensure task list checkboxes are disabled (read-only)
    input: ({ node, type, ...props }) => {
      if (type === 'checkbox') {
        return <input type="checkbox" disabled {...props} />;
      }
      return <input type={type} {...props} />;
    },
  };

  return (
    <div className="markdown-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
