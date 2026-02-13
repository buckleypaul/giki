import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeView } from './CodeView';

describe('CodeView', () => {
  it('renders file path in header', () => {
    render(<CodeView content="console.log('test');" filePath="src/app.js" />);
    expect(screen.getByText('src/app.js')).toBeInTheDocument();
  });

  it('renders language badge for known extensions', () => {
    render(<CodeView content="package main" filePath="main.go" />);
    expect(screen.getByText('go')).toBeInTheDocument();
  });

  it('does not render language badge for unknown extensions', () => {
    render(<CodeView content="some text" filePath="file.txt" />);
    expect(screen.queryByText('txt')).not.toBeInTheDocument();
  });

  it('renders code content', () => {
    const content = 'function hello() {\n  return "world";\n}';
    const { container } = render(<CodeView content={content} filePath="hello.js" />);
    // Syntax highlighting may break up text, so check the code element contains the content
    const codeElement = container.querySelector('code');
    expect(codeElement?.textContent).toBe(content);
  });

  it('renders line numbers', () => {
    const content = 'line 1\nline 2\nline 3';
    const { container } = render(<CodeView content={content} filePath="test.txt" />);

    // Find line numbers in the line-numbers div
    const lineNumbers = container.querySelectorAll('.line-number');
    expect(lineNumbers.length).toBe(3);
    expect(lineNumbers[0].textContent).toBe('1');
    expect(lineNumbers[1].textContent).toBe('2');
    expect(lineNumbers[2].textContent).toBe('3');
  });

  it('applies correct language class for syntax highlighting', () => {
    const { container } = render(
      <CodeView content="const x = 1;" filePath="test.ts" />
    );
    const codeElement = container.querySelector('code');
    expect(codeElement).toHaveClass('language-typescript');
  });

  it('handles empty content', () => {
    render(<CodeView content="" filePath="empty.js" />);
    expect(screen.getByText('empty.js')).toBeInTheDocument();
  });

  it('handles single line content', () => {
    render(<CodeView content="single line" filePath="test.txt" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });
});
