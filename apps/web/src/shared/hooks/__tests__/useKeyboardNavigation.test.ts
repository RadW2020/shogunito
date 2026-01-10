import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useKeyboardNavigation,
  useFocusTrap,
  useFocusRestore,
  useAriaLiveAnnouncement,
} from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Keyboard events', () => {
    it('should call onEnter when Enter key is pressed', () => {
      const onEnter = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onEnter,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('should call onEscape when Escape key is pressed', () => {
      const onEscape = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onEscape,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it('should call onArrowUp when ArrowUp key is pressed', () => {
      const onArrowUp = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onArrowUp,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(event);

      expect(onArrowUp).toHaveBeenCalledTimes(1);
    });

    it('should call onArrowDown when ArrowDown key is pressed', () => {
      const onArrowDown = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onArrowDown,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);

      expect(onArrowDown).toHaveBeenCalledTimes(1);
    });

    it('should call onTab when Tab key is pressed', () => {
      const onTab = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onTab,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(event);

      expect(onTab).toHaveBeenCalledWith(event);
    });

    it('should prevent default when handler is provided', () => {
      const onEnter = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onEnter,
          enabled: true,
        }),
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not call handlers when disabled', () => {
      const onEnter = vi.fn();
      renderHook(() =>
        useKeyboardNavigation({
          onEnter,
          enabled: false,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);

      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe('Element ref', () => {
    it('should attach listener to element ref when provided', () => {
      const onEnter = vi.fn();
      const element = document.createElement('div');
      const ref = { current: element };

      renderHook(() =>
        useKeyboardNavigation({
          onEnter,
          enabled: true,
          elementRef: ref,
        }),
      );

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      element.dispatchEvent(event);

      expect(onEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const onEnter = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardNavigation({
          onEnter,
          enabled: true,
        }),
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should focus first element when trap activates', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    const ref = { current: container };
    const focusSpy = vi.spyOn(button1, 'focus');

    renderHook(() => useFocusTrap(ref, true));

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should trap Tab key within container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    // Focus last element
    button2.focus();

    // Press Tab - should wrap to first
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
    const focusSpy = vi.spyOn(button1, 'focus');

    container.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('should trap Shift+Tab key within container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    // Focus first element
    button1.focus();

    // Press Shift+Tab - should wrap to last
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');
    const focusSpy = vi.spyOn(button2, 'focus');

    container.dispatchEvent(shiftTabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('should not trap when isActive is false', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const button1 = document.createElement('button');
    container.appendChild(button1);

    const ref = { current: container };
    const focusSpy = vi.spyOn(button1, 'focus');

    renderHook(() => useFocusTrap(ref, false));

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');

    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('useFocusRestore', () => {
  it('should restore focus to previously focused element on unmount', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const focusSpy = vi.spyOn(button, 'focus');

    const { unmount } = renderHook(() => useFocusRestore());

    // Change focus
    document.body.focus();

    unmount();

    expect(focusSpy).toHaveBeenCalled();
  });
});

describe('useAriaLiveAnnouncement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should create announcement element', () => {
    const { result } = renderHook(() => useAriaLiveAnnouncement());

    result.current.announce('Test message');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeInTheDocument();
    expect(announcement?.textContent).toBe('Test message');
    expect(announcement?.getAttribute('aria-live')).toBe('polite');
  });

  it('should support assertive priority', () => {
    const { result } = renderHook(() => useAriaLiveAnnouncement());

    result.current.announce('Urgent message', 'assertive');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.getAttribute('aria-live')).toBe('assertive');
  });

  it('should remove announcement after timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAriaLiveAnnouncement());

    result.current.announce('Test message');

    expect(document.querySelector('[role="status"]')).toBeInTheDocument();

    vi.advanceTimersByTime(1100);

    expect(document.querySelector('[role="status"]')).toBeNull();

    vi.useRealTimers();
  });
});
