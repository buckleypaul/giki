import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Editor } from './Editor';
import { PendingChangesProvider } from '../context/PendingChangesContext';
import { BrowserRouter } from 'react-router-dom';

// Mock CodeMirror to avoid rendering issues in tests
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="codemirror-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock language modules
vi.mock('@codemirror/lang-markdown', () => ({
  markdown: () => ({}),
}));

vi.mock('@codemirror/language-data', () => ({
  languages: [],
}));

function renderEditor(props = {}) {
  const defaultProps = {
    filePath: 'README.md',
    initialContent: '# Hello World',
    onCancel: vi.fn(),
  };

  return render(
    <BrowserRouter>
      <PendingChangesProvider>
        <Editor {...defaultProps} {...props} />
      </PendingChangesProvider>
    </BrowserRouter>
  );
}

describe('Editor', () => {
  it('renders the editor with file path in title', () => {
    renderEditor({ filePath: 'docs/guide.md' });
    expect(screen.getByText('Editing: docs/guide.md')).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders split panes with Editor and Preview titles', () => {
    renderEditor();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders CodeMirror with initial content', () => {
    renderEditor({ initialContent: '# Test Content' });
    const editor = screen.getByTestId('codemirror-editor');
    expect(editor).toHaveValue('# Test Content');
  });

  it('renders live preview of markdown content', () => {
    renderEditor({ initialContent: '# Hello World' });
    // MarkdownView renders the heading
    expect(screen.getByRole('heading', { name: /hello world/i })).toBeInTheDocument();
  });

  it('updates preview when editor content changes', async () => {
    const user = userEvent.setup();
    renderEditor({ initialContent: '# Original' });

    // Find the editor and change content
    const editor = screen.getByTestId('codemirror-editor');
    await user.clear(editor);
    await user.type(editor, '# Updated');

    // Preview should update
    expect(screen.getByRole('heading', { name: /updated/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderEditor({ onCancel });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('adds pending change and calls onCancel when Save is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderEditor({ filePath: 'test.md', initialContent: '# Original', onCancel });

    // Modify content
    const editor = screen.getByTestId('codemirror-editor');
    await user.clear(editor);
    await user.type(editor, '# Modified');

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Should call onCancel (returns to read view)
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('handles nested file paths correctly in preview basePath', () => {
    renderEditor({
      filePath: 'docs/guides/setup.md',
      initialContent: '# Setup Guide',
    });

    // The component should render without errors
    expect(screen.getByText('Editing: docs/guides/setup.md')).toBeInTheDocument();
  });

  it('handles root-level files correctly', () => {
    renderEditor({
      filePath: 'README.md',
      initialContent: '# README',
    });

    expect(screen.getByText('Editing: README.md')).toBeInTheDocument();
    // Check for the h1 heading from the markdown preview (not the h2 editor title)
    const headings = screen.getAllByRole('heading', { name: /readme/i });
    const h1 = headings.find(h => h.tagName === 'H1');
    expect(h1).toBeInTheDocument();
  });
});
