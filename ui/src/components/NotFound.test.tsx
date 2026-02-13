import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('renders 404 heading', () => {
    render(
      <BrowserRouter>
        <NotFound path="/nonexistent.md" />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /404.*not found/i })).toBeInTheDocument();
  });

  it('displays the requested path', () => {
    render(
      <BrowserRouter>
        <NotFound path="/docs/missing.md" />
      </BrowserRouter>
    );

    expect(screen.getByText('/docs/missing.md')).toBeInTheDocument();
  });

  it('renders link to home', () => {
    render(
      <BrowserRouter>
        <NotFound path="/missing" />
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: /go to home/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders with root path', () => {
    render(
      <BrowserRouter>
        <NotFound path="/" />
      </BrowserRouter>
    );

    expect(screen.getByText('/')).toBeInTheDocument();
  });
});
