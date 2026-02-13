import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageView } from './ImageView';

describe('ImageView', () => {
  it('renders file path in header', () => {
    render(<ImageView filePath="images/logo.png" />);
    expect(screen.getByText('images/logo.png')).toBeInTheDocument();
  });

  it('renders image with correct src URL', () => {
    render(<ImageView filePath="images/logo.png" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/api/file/images/logo.png');
  });

  it('sets alt text to file path', () => {
    render(<ImageView filePath="assets/photo.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'assets/photo.jpg');
  });

  it('handles root-level images', () => {
    render(<ImageView filePath="favicon.ico" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/api/file/favicon.ico');
  });

  it('handles deeply nested paths', () => {
    render(<ImageView filePath="docs/images/screenshots/app.png" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/api/file/docs/images/screenshots/app.png');
  });
});
