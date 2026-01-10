import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  LoadingSkeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
} from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  describe('Basic rendering', () => {
    it('should render skeleton', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('should apply default variant (text)', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('h-4');
      expect(skeleton.className).toContain('rounded');
    });
  });

  describe('Variants', () => {
    it('should render text variant', () => {
      const { container } = render(<LoadingSkeleton variant="text" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('h-4');
      expect(skeleton.className).toContain('rounded');
    });

    it('should render circle variant', () => {
      const { container } = render(<LoadingSkeleton variant="circle" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('rounded-full');
    });

    it('should render rectangle variant', () => {
      const { container } = render(<LoadingSkeleton variant="rectangle" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('rounded-md');
    });

    it('should render card variant', () => {
      const { container } = render(<LoadingSkeleton variant="card" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('h-48');
      expect(skeleton.className).toContain('rounded-lg');
    });

    it('should render table variant', () => {
      const { container } = render(<LoadingSkeleton variant="table" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('h-12');
      expect(skeleton.className).toContain('rounded');
    });

    it('should render list variant', () => {
      const { container } = render(<LoadingSkeleton variant="list" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('h-16');
      expect(skeleton.className).toContain('rounded-md');
    });
  });

  describe('Sizing', () => {
    it('should apply custom width', () => {
      const { container } = render(<LoadingSkeleton width="200px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
    });

    it('should apply custom height', () => {
      const { container } = render(<LoadingSkeleton height="50px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.height).toBe('50px');
    });

    it('should apply numeric width', () => {
      const { container } = render(<LoadingSkeleton width={300} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('300px');
    });

    it('should use 100% width by default', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('100%');
    });
  });

  describe('Multiple skeletons', () => {
    it('should render multiple skeletons when count > 1', () => {
      const { container } = render(<LoadingSkeleton count={3} />);
      const skeletons = container.querySelectorAll('div');
      // Should have 3 skeletons + 1 wrapper div
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply spacing between multiple skeletons', () => {
      const { container } = render(<LoadingSkeleton count={3} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('space-y-3');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LoadingSkeleton className="custom-class" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('custom-class');
    });
  });
});

describe('SkeletonText', () => {
  it('should render default 3 lines', () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(skeletons.length).toBe(3);
  });

  it('should render custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    expect(skeletons.length).toBe(5);
  });

  it('should make last line shorter', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    const lastLine = skeletons[skeletons.length - 1] as HTMLElement;
    expect(lastLine.style.width).toBe('80%');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonText className="custom" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom');
  });
});

describe('SkeletonCard', () => {
  it('should render card structure', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('p-4');
  });

  it('should render avatar and content', () => {
    const { container } = render(<SkeletonCard />);
    const circleSkeletons = container.querySelectorAll('div[class*="rounded-full"]');
    expect(circleSkeletons.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonCard className="custom" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom');
  });
});

describe('SkeletonTable', () => {
  it('should render default 5 rows and 4 columns', () => {
    const { container } = render(<SkeletonTable />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    // Header row (4 columns) + 5 data rows (4 columns each) = 24 skeletons
    expect(skeletons.length).toBe(24);
  });

  it('should render custom rows and columns', () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    // Header (2) + 3 rows (2 each) = 8
    expect(skeletons.length).toBe(8);
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonTable className="custom" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom');
  });
});

describe('SkeletonList', () => {
  it('should render default 5 items', () => {
    const { container } = render(<SkeletonList />);
    const circleSkeletons = container.querySelectorAll('div[class*="rounded-full"]');
    expect(circleSkeletons.length).toBe(5);
  });

  it('should render custom number of items', () => {
    const { container } = render(<SkeletonList items={10} />);
    const circleSkeletons = container.querySelectorAll('div[class*="rounded-full"]');
    expect(circleSkeletons.length).toBe(10);
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonList className="custom" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom');
  });
});

describe('SkeletonForm', () => {
  it('should render default 3 fields', () => {
    const { container } = render(<SkeletonForm />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    // 3 labels + 3 inputs + 1 button = 7
    expect(skeletons.length).toBe(7);
  });

  it('should render custom number of fields', () => {
    const { container } = render(<SkeletonForm fields={5} />);
    const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
    // 5 labels + 5 inputs + 1 button = 11
    expect(skeletons.length).toBe(11);
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonForm className="custom" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom');
  });
});
