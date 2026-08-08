import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden">content</Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders title and children when open, and calls onClose from the close button', async () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Add item">Body text</Modal>);
    expect(screen.getByText('Add item')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
