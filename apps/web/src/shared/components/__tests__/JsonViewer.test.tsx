import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JsonViewer } from '../JsonViewer';

describe('JsonViewer', () => {
  it('renders primitive values correctly', () => {
    const { container } = render(<JsonViewer data="test string" name="key" />);
    expect(container.textContent).toContain('key');
    expect(container.textContent).toContain('"test string"');
  });

  it('renders numbers correctly', () => {
    const { container } = render(<JsonViewer data={42} name="count" />);
    expect(container.textContent).toContain('count');
    expect(container.textContent).toContain('42');
  });

  it('renders booleans correctly', () => {
    const { container } = render(<JsonViewer data={true} name="isActive" />);
    expect(container.textContent).toContain('isActive');
    expect(container.textContent).toContain('true');
  });

  it('renders null correctly', () => {
    const { container } = render(<JsonViewer data={null} name="empty" />);
    expect(container.textContent).toContain('empty');
    expect(container.textContent).toContain('null');
  });

  it('renders objects with expand/collapse functionality', () => {
    const data = {
      name: 'John',
      age: 30,
    };

    const { container } = render(<JsonViewer data={data} defaultExpanded={false} />);

    // Should show collapsed preview
    expect(container.textContent).toContain('{2 keys}');

    // Find and click the expandable element
    const expandable = container.querySelector('.json-viewer-line');
    if (expandable) {
      fireEvent.click(expandable);

      // Should now show expanded content
      expect(container.textContent).toContain('name');
      expect(container.textContent).toContain('age');
    }
  });

  it('renders arrays with expand/collapse functionality', () => {
    const data = ['apple', 'banana', 'cherry'];

    const { container } = render(<JsonViewer data={data} defaultExpanded={false} />);

    // Should show collapsed preview
    expect(container.textContent).toContain('[3 items]');

    // Find and click the expandable element
    const expandable = container.querySelector('.json-viewer-line');
    if (expandable) {
      fireEvent.click(expandable);

      // Should now show expanded content
      expect(container.textContent).toContain('apple');
      expect(container.textContent).toContain('banana');
      expect(container.textContent).toContain('cherry');
    }
  });

  it('renders nested objects correctly', () => {
    const data = {
      user: {
        name: 'John',
        address: {
          city: 'New York',
        },
      },
    };

    const { container } = render(<JsonViewer data={data} defaultExpanded={true} />);

    // Should show nested structure
    expect(container.textContent).toContain('user');
    expect(container.textContent).toContain('name');
    expect(container.textContent).toContain('address');
  });

  it('renders empty objects and arrays correctly', () => {
    const { container: emptyObjContainer } = render(<JsonViewer data={{}} />);
    const objText = emptyObjContainer.textContent || '';
    // Empty objects show as '{}'
    expect(objText).toContain('{}');

    const { container: emptyArrContainer } = render(<JsonViewer data={[]} />);
    const arrText = emptyArrContainer.textContent || '';
    // Empty arrays show as '[]'
    expect(arrText).toContain('[]');
  });

  it('applies correct indentation for nested levels', () => {
    const data = {
      level1: {
        level2: {
          level3: 'deep',
        },
      },
    };

    const { container } = render(<JsonViewer data={data} defaultExpanded={true} />);

    // Check that nested elements exist (indentation is applied via inline styles)
    const lines = container.querySelectorAll('.json-viewer-line');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('toggles expansion state when clicked', () => {
    const data = { key: 'value' };

    const { container } = render(<JsonViewer data={data} defaultExpanded={true} />);

    // Initially expanded
    expect(container.textContent).toContain('key');

    // Click to collapse
    const expandable = container.querySelector('.json-viewer-line');
    if (expandable) {
      fireEvent.click(expandable);

      // Should be collapsed
      expect(container.textContent).toContain('{1 key}');

      // Click to expand again
      fireEvent.click(expandable);

      // Should be expanded again
      expect(container.textContent).toContain('key');
    }
  });
});
