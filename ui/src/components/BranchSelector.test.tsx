import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchSelector } from './BranchSelector';
import { BranchProvider } from '../context/BranchContext';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client');

const mockFetchBranches = vi.mocked(apiClient.fetchBranches);
const mockFetchStatus = vi.mocked(apiClient.fetchStatus);

describe('BranchSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockFetchStatus.mockResolvedValue({
      source: '/test/repo',
      branch: 'main',
      isDirty: false,
    });
  });

  it('renders loading state initially', () => {
    mockFetchBranches.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    expect(screen.getByText('Loading branches...')).toBeInTheDocument();
  });

  it('renders all branches from API', async () => {
    mockFetchBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'feature', isDefault: false },
      { name: 'dev', isDefault: false },
    ]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map(opt => opt.textContent);

    expect(options).toContain('main (default)');
    expect(options).toContain('feature ');
    expect(options).toContain('dev ');
  });

  it('shows current branch as selected', async () => {
    mockFetchBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'feature', isDefault: false },
    ]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Wait for BranchContext to initialize with 'main'
    await waitFor(() => {
      expect(select.value).toBe('main');
    });
  });

  it('marks default branch with (default) suffix', async () => {
    mockFetchBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'feature', isDefault: false },
    ]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const mainOption = Array.from(select.options).find(opt => opt.value === 'main');

    expect(mainOption?.textContent).toContain('(default)');
  });

  it('calls setSelectedBranch when selection changes', async () => {
    const user = userEvent.setup();

    mockFetchBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
      { name: 'feature', isDefault: false },
    ]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Change selection to 'feature'
    await user.selectOptions(select, 'feature');

    // Verify the select value updated
    await waitFor(() => {
      expect(select.value).toBe('feature');
    });
  });

  it('handles empty branches list', async () => {
    mockFetchBranches.mockResolvedValue([]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(0);
  });

  it('handles fetch error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchBranches.mockRejectedValue(new Error('Network error'));

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('renders select with aria-label', async () => {
    mockFetchBranches.mockResolvedValue([
      { name: 'main', isDefault: true },
    ]);

    render(
      <BranchProvider>
        <BranchSelector />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Select branch');
    expect(select).toBeInTheDocument();
  });
});
