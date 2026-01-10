import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalContent } from '../Modal';

// Mock the keyboard navigation hooks
vi.mock('../../hooks/useKeyboardNavigation', () => ({
  useFocusTrap: vi.fn(),
  useFocusRestore: vi.fn(),
  useKeyboardNavigation: vi.fn(),
}));

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Basic rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });
  });

  describe('Close button', () => {
    it('should render close button by default', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('should not render close button when hideCloseButton is true', () => {
      render(<Modal {...defaultProps} hideCloseButton={true} />);
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Modal {...defaultProps} onClose={onClose} />);

      // Backdrop has aria-hidden="true"
      const backdrop = screen.getByText('Test Modal').closest('.fixed')?.previousSibling;
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Sizes', () => {
    it('should apply sm size classes', () => {
      const { container } = render(<Modal {...defaultProps} size="sm" />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).toContain('sm:max-w-md');
    });

    it('should apply md size classes (default)', () => {
      const { container } = render(<Modal {...defaultProps} size="md" />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).toContain('sm:max-w-lg');
    });

    it('should apply lg size classes', () => {
      const { container } = render(<Modal {...defaultProps} size="lg" />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).toContain('sm:max-w-2xl');
    });

    it('should apply xl size classes', () => {
      const { container } = render(<Modal {...defaultProps} size="xl" />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).toContain('sm:max-w-4xl');
    });
  });

  describe('Mobile behavior', () => {
    it('should be full screen on mobile by default', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).toContain('h-full');
      expect(modal?.className).toContain('w-full');
      expect(modal?.className).toContain('sm:h-auto');
    });

    it('should not be full screen when fullScreenOnMobile is false', () => {
      const { container } = render(<Modal {...defaultProps} fullScreenOnMobile={false} />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal?.className).not.toContain('h-full');
      expect(modal?.className).toContain('max-h-[90vh]');
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modal = container.querySelector('[role="dialog"]');
      expect(modal).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modal = container.querySelector('[aria-modal="true"]');
      expect(modal).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modal = container.querySelector('[role="dialog"]') as HTMLElement;
      const titleId = modal?.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();

      const title = document.getElementById(titleId || '');
      expect(title?.textContent).toBe('Test Modal');
    });

    it('should have aria-hidden on backdrop', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Body scroll lock', () => {
    it('should lock body scroll when modal is open', () => {
      render(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when modal is closed', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Content scrolling', () => {
    it('should have scrollable content area', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const content = container.querySelector('.overflow-y-auto');
      expect(content).toBeInTheDocument();
    });
  });
});

describe('ModalContent', () => {
  it('should render children', () => {
    render(
      <ModalContent>
        <div>Test Content</div>
      </ModalContent>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ModalContent className="custom-class">
        <div>Content</div>
      </ModalContent>,
    );
    const content = container.firstChild as HTMLElement;
    expect(content.className).toContain('custom-class');
  });

  it('should have default padding classes', () => {
    const { container } = render(
      <ModalContent>
        <div>Content</div>
      </ModalContent>,
    );
    const content = container.firstChild as HTMLElement;
    expect(content.className).toContain('px-4');
    expect(content.className).toContain('sm:px-6');
    expect(content.className).toContain('py-4');
  });
});
