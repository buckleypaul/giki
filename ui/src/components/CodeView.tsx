import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { getLanguageFromExtension } from '../utils/fileType';
import './CodeView.css';

interface CodeViewProps {
  content: string;
  filePath: string;
}

export function CodeView({ content, filePath }: CodeViewProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // Clear any existing highlighting
      codeRef.current.removeAttribute('data-highlighted');

      // Apply syntax highlighting
      hljs.highlightElement(codeRef.current);
    }
  }, [content]);

  const language = getLanguageFromExtension(filePath);

  // Split content into lines for line numbers
  const lines = content.split('\n');

  return (
    <div className="code-view">
      <div className="code-view-header">
        <span className="code-view-filename">{filePath}</span>
        {language && <span className="code-view-language">{language}</span>}
      </div>
      <div className="code-view-body">
        <div className="code-view-line-numbers">
          {lines.map((_, index) => (
            <div key={index} className="line-number">
              {index + 1}
            </div>
          ))}
        </div>
        <pre className="code-view-content">
          <code ref={codeRef} className={language ? `language-${language}` : ''}>
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
}
