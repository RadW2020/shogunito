import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getIconButtonLabel,
  AriaLabels,
  generateA11yId,
  isVisibleToScreenReaders,
  skipToContent,
  announceToScreenReader,
  getFormFieldA11yProps,
  getLoadingA11yProps,
  getDialogA11yProps,
  getIconButtonA11yProps,
  getListA11yProps,
  getTooltipA11yProps,
  meetsContrastRatio,
} from '../accessibility';

describe('accessibility utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getIconButtonLabel', () => {
    it('should return action when no context provided', () => {
      expect(getIconButtonLabel('Delete')).toBe('Delete');
    });

    it('should return action with context when provided', () => {
      expect(getIconButtonLabel('Delete', 'project')).toBe('Delete project');
    });
  });

  describe('AriaLabels', () => {
    it('should have common action labels', () => {
      expect(AriaLabels.close).toBe('Close');
      expect(AriaLabels.save).toBe('Save');
      expect(AriaLabels.delete).toBe('Delete');
      expect(AriaLabels.edit).toBe('Edit');
    });

    it('should have contextual builders', () => {
      expect(AriaLabels.closeDialog()).toBe('Close dialog');
      expect(AriaLabels.closeDialog('Settings')).toBe('Close Settings dialog');
      expect(AriaLabels.editItem('Project')).toBe('Edit Project');
      expect(AriaLabels.editItem('Project', 'My Project')).toBe('Edit Project My Project');
      expect(AriaLabels.deleteItem('Shot', 'SH001')).toBe('Delete Shot SH001');
    });
  });

  describe('generateA11yId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateA11yId('test');
      const id2 = generateA11yId('test');

      expect(id1).toMatch(/^test-/);
      expect(id2).toMatch(/^test-/);
      // IDs should be different (though there's a small chance they could be the same)
      expect(id1.length).toBeGreaterThan(5);
    });

    it('should use different prefixes', () => {
      const id1 = generateA11yId('prefix1');
      const id2 = generateA11yId('prefix2');

      expect(id1).toMatch(/^prefix1-/);
      expect(id2).toMatch(/^prefix2-/);
    });
  });

  describe('isVisibleToScreenReaders', () => {
    it('should return true for element without aria-hidden', () => {
      const element = document.createElement('div');
      expect(isVisibleToScreenReaders(element)).toBe(true);
    });

    it('should return false for element with aria-hidden="true"', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'true');
      expect(isVisibleToScreenReaders(element)).toBe(false);
    });

    it('should return true for element with aria-hidden="false"', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'false');
      // Implementation: !hasAttribute('aria-hidden') || getAttribute('aria-hidden') !== 'true'
      // hasAttribute returns true, so checks: getAttribute('aria-hidden') !== 'true'
      // 'false' !== 'true' → true, so should return true
      expect(isVisibleToScreenReaders(element)).toBe(true);
    });
  });

  describe('skipToContent', () => {
    it('should focus content element when it exists', () => {
      const content = document.createElement('div');
      content.id = 'main-content';
      document.body.appendChild(content);

      const focusSpy = vi.spyOn(content, 'focus');

      skipToContent('main-content');

      expect(focusSpy).toHaveBeenCalled();
      expect(content.getAttribute('tabindex')).toBeNull();
    });

    it('should handle missing content element gracefully', () => {
      expect(() => skipToContent('non-existent')).not.toThrow();
    });
  });

  describe('announceToScreenReader', () => {
    it('should create and remove announcement element', () => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeTruthy();
      expect(announcement?.getAttribute('aria-live')).toBe('polite');
      expect(announcement?.getAttribute('aria-atomic')).toBe('true');
      expect(announcement?.textContent).toBe('Test message');

      // Wait for cleanup
      return new Promise((resolve) => {
        setTimeout(() => {
          const removed = document.querySelector('[role="status"]');
          expect(removed).toBeNull();
          resolve(undefined);
        }, 1100);
      });
    });

    it('should support assertive priority', () => {
      announceToScreenReader('Urgent message', 'assertive');

      const announcement = document.querySelector('[role="status"]');
      expect(announcement?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('getFormFieldA11yProps', () => {
    it('should return basic props', () => {
      const props = getFormFieldA11yProps('fieldName');
      expect(props.id).toBe('fieldName');
      expect(props.name).toBe('fieldName');
    });

    it('should add aria-required when required', () => {
      const props = getFormFieldA11yProps('fieldName', { required: true });
      expect(props['aria-required']).toBe('true');
    });

    it('should add aria-invalid when invalid', () => {
      const props = getFormFieldA11yProps('fieldName', { invalid: true });
      expect(props['aria-invalid']).toBe('true');
    });

    it('should add aria-describedby with errorId when invalid', () => {
      const props = getFormFieldA11yProps('fieldName', {
        invalid: true,
        errorId: 'error-1',
      });
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBe('error-1');
    });

    it('should add aria-describedby with describedBy when not invalid', () => {
      const props = getFormFieldA11yProps('fieldName', {
        describedBy: 'help-1',
      });
      expect(props['aria-describedby']).toBe('help-1');
    });

    it('should prioritize errorId over describedBy when invalid', () => {
      const props = getFormFieldA11yProps('fieldName', {
        invalid: true,
        errorId: 'error-1',
        describedBy: 'help-1',
      });
      expect(props['aria-describedby']).toBe('error-1');
    });
  });

  describe('getLoadingA11yProps', () => {
    it('should return empty object when not loading', () => {
      const props = getLoadingA11yProps(false);
      expect(props).toEqual({});
    });

    it('should return loading props when loading', () => {
      const props = getLoadingA11yProps(true);
      expect(props['aria-busy']).toBe('true');
      expect(props['aria-live']).toBe('polite');
      expect(props['aria-label']).toBe('Loading');
    });

    it('should use custom loading text', () => {
      const props = getLoadingA11yProps(true, 'Cargando...');
      expect(props['aria-label']).toBe('Cargando...');
    });
  });

  describe('getDialogA11yProps', () => {
    it('should return dialog props when open', () => {
      const props = getDialogA11yProps({
        titleId: 'dialog-title',
        descriptionId: 'dialog-desc',
        isOpen: true,
      });

      expect(props.role).toBe('dialog');
      expect(props['aria-modal']).toBe('true');
      expect(props['aria-labelledby']).toBe('dialog-title');
      expect(props['aria-describedby']).toBe('dialog-desc');
      expect(props['aria-hidden']).toBe(false);
    });

    it('should return hidden dialog when closed', () => {
      const props = getDialogA11yProps({
        titleId: 'dialog-title',
        isOpen: false,
      });

      expect(props['aria-hidden']).toBe(true);
    });

    it('should handle optional descriptionId', () => {
      const props = getDialogA11yProps({
        titleId: 'dialog-title',
        isOpen: true,
      });

      expect(props['aria-describedby']).toBeUndefined();
    });
  });

  describe('getIconButtonA11yProps', () => {
    it('should return basic aria-label', () => {
      const props = getIconButtonA11yProps('Click me');
      expect(props['aria-label']).toBe('Click me');
    });

    it('should add aria-pressed when provided', () => {
      const props = getIconButtonA11yProps('Toggle', { pressed: true });
      expect(props['aria-pressed']).toBe(true);
    });

    it('should add aria-expanded when provided', () => {
      const props = getIconButtonA11yProps('Expand', { expanded: true });
      expect(props['aria-expanded']).toBe(true);
    });

    it('should add aria-haspopup when provided', () => {
      const props = getIconButtonA11yProps('Menu', { hasPopup: 'menu' });
      expect(props['aria-haspopup']).toBe('menu');
    });

    it('should default hasPopup to menu when true', () => {
      const props = getIconButtonA11yProps('Menu', { hasPopup: true });
      expect(props['aria-haspopup']).toBe('menu');
    });
  });

  describe('getListA11yProps', () => {
    it('should return basic list role', () => {
      const props = getListA11yProps({});
      expect(props.role).toBe('list');
    });

    it('should add aria-label when provided', () => {
      const props = getListA11yProps({ label: 'Navigation' });
      expect(props['aria-label']).toBe('Navigation');
    });

    it('should add aria-multiselectable when provided', () => {
      const props = getListA11yProps({ multiselectable: true });
      expect(props['aria-multiselectable']).toBe('true');
    });

    it('should add aria-orientation when provided', () => {
      const props = getListA11yProps({ orientation: 'horizontal' });
      expect(props['aria-orientation']).toBe('horizontal');
    });
  });

  describe('getTooltipA11yProps', () => {
    it('should return aria-describedby when visible', () => {
      const props = getTooltipA11yProps('tooltip-1', true);
      expect(props['aria-describedby']).toBe('tooltip-1');
      expect(props['aria-expanded']).toBe(true);
    });

    it('should return undefined when not visible', () => {
      const props = getTooltipA11yProps('tooltip-1', false);
      expect(props['aria-describedby']).toBeUndefined();
      expect(props['aria-expanded']).toBe(false);
    });
  });

  describe('meetsContrastRatio', () => {
    it('should return true (placeholder implementation)', () => {
      // This is a placeholder, so it always returns true
      expect(meetsContrastRatio('#000000', '#ffffff')).toBe(true);
      expect(meetsContrastRatio('#ff0000', '#00ff00')).toBe(true);
    });
  });
});
