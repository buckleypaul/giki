import { describe, it, expect } from 'vitest';
import { getFileType, getLanguageFromExtension, formatFileSize } from './fileType';

describe('getFileType', () => {
  it('detects markdown files', () => {
    expect(getFileType('README.md')).toBe('markdown');
    expect(getFileType('docs/guide.markdown')).toBe('markdown');
    expect(getFileType('file.mdown')).toBe('markdown');
    expect(getFileType('file.mkd')).toBe('markdown');
  });

  it('detects code files', () => {
    expect(getFileType('main.go')).toBe('code');
    expect(getFileType('script.py')).toBe('code');
    expect(getFileType('Component.tsx')).toBe('code');
    expect(getFileType('styles.css')).toBe('code');
    expect(getFileType('config.json')).toBe('code');
    expect(getFileType('data.yaml')).toBe('code');
    expect(getFileType('app.js')).toBe('code');
    expect(getFileType('index.html')).toBe('code');
  });

  it('detects image files', () => {
    expect(getFileType('logo.png')).toBe('image');
    expect(getFileType('photo.jpg')).toBe('image');
    expect(getFileType('photo.jpeg')).toBe('image');
    expect(getFileType('animation.gif')).toBe('image');
    expect(getFileType('icon.svg')).toBe('image');
    expect(getFileType('image.webp')).toBe('image');
  });

  it('detects binary files', () => {
    expect(getFileType('archive.zip')).toBe('binary');
    expect(getFileType('archive.tar')).toBe('binary');
    expect(getFileType('compressed.gz')).toBe('binary');
    expect(getFileType('document.pdf')).toBe('binary');
    expect(getFileType('program.exe')).toBe('binary');
    expect(getFileType('library.so')).toBe('binary');
    expect(getFileType('music.mp3')).toBe('binary');
    expect(getFileType('video.mp4')).toBe('binary');
  });

  it('returns unknown for files without extension', () => {
    expect(getFileType('Makefile')).toBe('unknown');
    expect(getFileType('LICENSE')).toBe('unknown');
    expect(getFileType('no-extension')).toBe('unknown');
  });

  it('returns unknown for unrecognized extensions', () => {
    expect(getFileType('file.xyz')).toBe('unknown');
    expect(getFileType('data.unknown')).toBe('unknown');
  });

  it('handles files in nested directories', () => {
    expect(getFileType('src/components/App.tsx')).toBe('code');
    expect(getFileType('docs/images/logo.png')).toBe('image');
    expect(getFileType('dist/bundle.zip')).toBe('binary');
  });

  it('handles case insensitivity', () => {
    expect(getFileType('FILE.MD')).toBe('markdown');
    expect(getFileType('SCRIPT.GO')).toBe('code');
    expect(getFileType('IMAGE.PNG')).toBe('image');
    expect(getFileType('ARCHIVE.ZIP')).toBe('binary');
  });

  it('handles dots in directory names', () => {
    expect(getFileType('v1.0.0/file.md')).toBe('markdown');
    expect(getFileType('.github/workflows/ci.yml')).toBe('code');
  });
});

describe('getLanguageFromExtension', () => {
  it('returns correct language for common extensions', () => {
    expect(getLanguageFromExtension('app.js')).toBe('javascript');
    expect(getLanguageFromExtension('app.ts')).toBe('typescript');
    expect(getLanguageFromExtension('main.go')).toBe('go');
    expect(getLanguageFromExtension('script.py')).toBe('python');
    expect(getLanguageFromExtension('app.rb')).toBe('ruby');
    expect(getLanguageFromExtension('Main.java')).toBe('java');
    expect(getLanguageFromExtension('program.c')).toBe('c');
    expect(getLanguageFromExtension('program.cpp')).toBe('cpp');
    expect(getLanguageFromExtension('lib.rs')).toBe('rust');
  });

  it('returns correct language for web files', () => {
    expect(getLanguageFromExtension('index.html')).toBe('html');
    expect(getLanguageFromExtension('styles.css')).toBe('css');
    expect(getLanguageFromExtension('styles.scss')).toBe('scss');
    expect(getLanguageFromExtension('config.json')).toBe('json');
    expect(getLanguageFromExtension('data.yaml')).toBe('yaml');
    expect(getLanguageFromExtension('data.yml')).toBe('yaml');
  });

  it('returns empty string for unknown extensions', () => {
    expect(getLanguageFromExtension('file.xyz')).toBe('');
    expect(getLanguageFromExtension('noext')).toBe('');
    expect(getLanguageFromExtension('README.md')).toBe('');
  });

  it('handles case insensitivity', () => {
    expect(getLanguageFromExtension('FILE.GO')).toBe('go');
    expect(getLanguageFromExtension('SCRIPT.PY')).toBe('python');
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 2)).toBe('2 MB');
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatFileSize(1234567)).toBe('1.18 MB');
    expect(formatFileSize(9876543210)).toBe('9.2 GB');
  });
});
