import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BinaryCard } from './BinaryCard';

describe('BinaryCard', () => {
  it('renders file name extracted from path', () => {
    render(<BinaryCard filePath="dist/app.zip" />);
    expect(screen.getByText('app.zip')).toBeInTheDocument();
  });

  it('renders full path', () => {
    render(<BinaryCard filePath="dist/archives/backup.tar.gz" />);
    expect(screen.getByText('dist/archives/backup.tar.gz')).toBeInTheDocument();
  });

  it('renders file size when provided', () => {
    render(<BinaryCard filePath="file.zip" size={1024 * 1024 * 2.5} />);
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
  });

  it('renders MIME type when provided', () => {
    render(<BinaryCard filePath="file.pdf" mimeType="application/pdf" />);
    expect(screen.getByText('application/pdf')).toBeInTheDocument();
  });

  it('renders all info when all props provided', () => {
    render(
      <BinaryCard
        filePath="downloads/video.mp4"
        size={1024 * 1024 * 10}
        mimeType="video/mp4"
      />
    );

    expect(screen.getByText('video.mp4')).toBeInTheDocument();
    expect(screen.getByText('downloads/video.mp4')).toBeInTheDocument();
    expect(screen.getByText('10 MB')).toBeInTheDocument();
    expect(screen.getByText('video/mp4')).toBeInTheDocument();
  });

  it('does not render size row when size not provided', () => {
    render(<BinaryCard filePath="file.zip" />);
    expect(screen.queryByText(/Size:/)).not.toBeInTheDocument();
  });

  it('does not render type row when mimeType not provided', () => {
    render(<BinaryCard filePath="file.zip" />);
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  });

  it('handles root-level files', () => {
    render(<BinaryCard filePath="archive.zip" />);
    // File name appears in both heading and full path, so use getAllByText
    const elements = screen.getAllByText('archive.zip');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('displays binary file message', () => {
    render(<BinaryCard filePath="file.exe" />);
    expect(
      screen.getByText('This is a binary file that cannot be displayed in the browser.')
    ).toBeInTheDocument();
  });
});
