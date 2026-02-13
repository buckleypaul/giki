import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { MarkdownView } from './MarkdownView';
import { usePendingChanges } from '../context/PendingChangesContext';
import './Editor.css';

interface EditorProps {
  filePath: string;
  initialContent: string;
  onCancel: () => void;
}

/**
 * Editor component with split-pane layout:
 * - Left pane: CodeMirror editor with markdown support
 * - Right pane: Live markdown preview
 * - Save button adds/updates pending change (does not write to disk)
 * - Cancel button returns to read view
 */
export function Editor({ filePath, initialContent, onCancel }: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const { addChange } = usePendingChanges();

  // Calculate basePath for markdown preview relative links
  const basePath = filePath.includes('/')
    ? filePath.substring(0, filePath.lastIndexOf('/'))
    : '';

  const handleSave = () => {
    // Add or update pending change (does not write to disk)
    addChange({
      type: 'modify',
      path: filePath,
      content: content,
    });

    // Return to read view
    onCancel();
  };

  return (
    <div className="editor">
      <div className="editor-header">
        <h2 className="editor-title">Editing: {filePath}</h2>
        <div className="editor-actions">
          <button onClick={onCancel} className="editor-button editor-cancel">
            Cancel
          </button>
          <button onClick={handleSave} className="editor-button editor-save">
            Save
          </button>
        </div>
      </div>

      <div className="editor-panes">
        <div className="editor-pane editor-left">
          <h3 className="editor-pane-title">Editor</h3>
          <CodeMirror
            value={content}
            onChange={(value) => setContent(value)}
            extensions={[
              markdown({ codeLanguages: languages }),
            ]}
            height="100%"
            className="editor-codemirror"
          />
        </div>

        <div className="editor-pane editor-right">
          <h3 className="editor-pane-title">Preview</h3>
          <div className="editor-preview">
            <MarkdownView content={content} basePath={basePath} />
          </div>
        </div>
      </div>
    </div>
  );
}
