import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ModalFooter,
  ModalButton,
  ModalPrimaryButton,
  ModalSecondaryButton,
  ModalDangerButton,
} from '../ModalFooter';

describe('ModalFooter', () => {
  describe('Basic rendering', () => {
    it('should render children', () => {
      render(
        <ModalFooter>
          <button>Test Button</button>
        </ModalFooter>,
      );
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ModalFooter className="custom-class">
          <button>Button</button>
        </ModalFooter>,
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('custom-class');
    });

    it('should have sticky behavior on mobile by default', () => {
      const { container } = render(
        <ModalFooter>
          <button>Button</button>
        </ModalFooter>,
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('sticky');
      expect(footer.className).toContain('bottom-0');
      expect(footer.className).toContain('sm:static');
    });

    it('should not be sticky when stickyOnMobile is false', () => {
      const { container } = render(
        <ModalFooter stickyOnMobile={false}>
          <button>Button</button>
        </ModalFooter>,
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).not.toContain('sticky');
    });

    it('should have border top', () => {
      const { container } = render(
        <ModalFooter>
          <button>Button</button>
        </ModalFooter>,
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer.className).toContain('border-t');
    });

    it('should have flex layout for buttons', () => {
      const { container } = render(
        <ModalFooter>
          <button>Button 1</button>
          <button>Button 2</button>
        </ModalFooter>,
      );
      const buttonContainer = container.querySelector('.flex');
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer?.className).toContain('justify-end');
    });
  });
});

describe('ModalButton', () => {
  describe('Basic rendering', () => {
    it('should render button with children', () => {
      render(<ModalButton>Click me</ModalButton>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ModalButton onClick={onClick}>Click</ModalButton>);

      const button = screen.getByText('Click');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ModalButton disabled>Click</ModalButton>);
      const button = screen.getByText('Click');
      expect(button).toBeDisabled();
    });

    it('should be disabled when loading is true', () => {
      render(<ModalButton loading>Click</ModalButton>);
      // The button element should be disabled, not the span with "Loading..."
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Button should show loading text instead of original text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Click')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(<ModalButton variant="primary">Primary</ModalButton>);
      const button = screen.getByText('Primary');
      expect(button.className).toContain('bg-blue-600');
    });

    it('should render secondary variant', () => {
      render(<ModalButton variant="secondary">Secondary</ModalButton>);
      const button = screen.getByText('Secondary');
      expect(button.className).toContain('bg-white');
    });

    it('should render danger variant', () => {
      render(<ModalButton variant="danger">Danger</ModalButton>);
      const button = screen.getByText('Danger');
      expect(button.className).toContain('bg-red-600');
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when loading is true', () => {
      render(<ModalButton loading>Submit</ModalButton>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    it('should have aria-busy when loading', () => {
      render(<ModalButton loading>Submit</ModalButton>);
      // aria-busy is on the button element, not the span
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should use ariaLabel when provided', () => {
      render(<ModalButton ariaLabel="Close dialog">X</ModalButton>);
      const button = screen.getByLabelText('Close dialog');
      expect(button).toBeInTheDocument();
    });

    it('should use children as aria-label when ariaLabel not provided and children is string', () => {
      render(<ModalButton>Close</ModalButton>);
      const button = screen.getByLabelText('Close');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Button types', () => {
    it('should render as button type by default', () => {
      render(<ModalButton>Click</ModalButton>);
      const button = screen.getByText('Click');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render as submit type when specified', () => {
      render(<ModalButton type="submit">Submit</ModalButton>);
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should render as reset type when specified', () => {
      render(<ModalButton type="reset">Reset</ModalButton>);
      const button = screen.getByText('Reset');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });
});

describe('ModalButton convenience exports', () => {
  it('should render ModalPrimaryButton with primary variant', () => {
    render(<ModalPrimaryButton>Primary</ModalPrimaryButton>);
    const button = screen.getByText('Primary');
    expect(button.className).toContain('bg-blue-600');
  });

  it('should render ModalSecondaryButton with secondary variant', () => {
    render(<ModalSecondaryButton>Secondary</ModalSecondaryButton>);
    const button = screen.getByText('Secondary');
    expect(button.className).toContain('bg-white');
  });

  it('should render ModalDangerButton with danger variant', () => {
    render(<ModalDangerButton>Delete</ModalDangerButton>);
    const button = screen.getByText('Delete');
    expect(button.className).toContain('bg-red-600');
  });
});
