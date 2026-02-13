import { useState, useEffect } from 'react';
import { fetchFile } from '../api/client';
import { getFileType, type FileType } from '../utils/fileType';
import { MarkdownView } from './MarkdownView';
import { CodeView } from './CodeView';
import { ImageView } from './ImageView';
import { BinaryCard } from './BinaryCard';
import { Editor } from './Editor';
import './FileViewer.css';

interface FileViewerProps {
  filePath: string;
  branch?: string;
  pendingContent?: string | null;
}

export function FileViewer({ filePath, branch, pendingContent }: FileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadFile() {
      // If we have pending content, use that instead of fetching from API
      if (pendingContent !== undefined && pendingContent !== null) {
        setContent(pendingContent);
        setLoading(false);
        setError(null);

        // Determine file type from path
        const detectedType = getFileType(filePath);
        setFileType(detectedType === 'unknown' ? 'code' : detectedType);
        return;
      }

      setLoading(true);
      setError(null);
      setContent(null);

      try {
        const text = await fetchFile(filePath, branch);
        setContent(text);

        // Determine file type
        const detectedType = getFileType(filePath);

        // For unknown files, try to detect if it's text or binary
        if (detectedType === 'unknown') {
          // Simple heuristic: if we can decode it as text and it doesn't have
          // too many null bytes or control characters, treat it as code
          const hasNullBytes = text.includes('\0');
          const controlCharCount = (text.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g) || []).length;
          const controlCharRatio = controlCharCount / text.length;

          if (!hasNullBytes && controlCharRatio < 0.1) {
            // Treat as plain text code
            setFileType('code');
          } else {
            // Treat as binary
            setFileType('binary');
          }
        } else {
          setFileType(detectedType);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    }

    loadFile();
  }, [filePath, branch, pendingContent]);

  if (loading) {
    return (
      <div className="file-viewer-state">
        <div className="file-viewer-spinner" />
        <p>Loading {filePath}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-viewer-state file-viewer-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="file-viewer-state">
        <p>No content</p>
      </div>
    );
  }

  // Get base path for relative link resolution (directory containing the file)
  const basePath = filePath.includes('/')
    ? filePath.substring(0, filePath.lastIndexOf('/'))
    : '';

  // If editing markdown, show editor
  if (isEditing && fileType === 'markdown') {
    return (
      <Editor
        filePath={filePath}
        initialContent={content}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  switch (fileType) {
    case 'markdown':
      return (
        <MarkdownView
          content={content}
          basePath={basePath}
          onEdit={() => setIsEditing(true)}
        />
      );

    case 'code':
      return <CodeView content={content} filePath={filePath} />;

    case 'image':
      return <ImageView filePath={filePath} />;

    case 'binary':
      return (
        <BinaryCard
          filePath={filePath}
          size={content.length}
        />
      );

    default:
      // Unknown file type - if we got here, we already checked for text-like content
      // so treat it as plain text code
      return <CodeView content={content} filePath={filePath} />;
  }
}
