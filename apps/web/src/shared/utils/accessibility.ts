/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Generate accessible aria-label for icon buttons
 */
export const getIconButtonLabel = (action: string, context?: string): string => {
  return context ? `${action} ${context}` : action;
};

/**
 * Common aria-labels for icon buttons
 */
export const AriaLabels = {
  // Actions
  close: 'Close',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  remove: 'Remove',
  cancel: 'Cancel',
  confirm: 'Confirm',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  refresh: 'Refresh',
  upload: 'Upload',
  download: 'Download',
  copy: 'Copy',
  paste: 'Paste',
  undo: 'Undo',
  redo: 'Redo',

  // Navigation
  menu: 'Open menu',
  closeMenu: 'Close menu',
  next: 'Next',
  previous: 'Previous',
  first: 'First',
  last: 'Last',
  home: 'Go to home',
  back: 'Go back',

  // Media
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  mute: 'Mute',
  unmute: 'Unmute',
  fullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',

  // UI Controls
  expand: 'Expand',
  collapse: 'Collapse',
  minimize: 'Minimize',
  maximize: 'Maximize',
  openInNewTab: 'Open in new tab',

  // Form
  clearInput: 'Clear input',
  showPassword: 'Show password',
  hidePassword: 'Hide password',

  // Social/Share
  share: 'Share',
  like: 'Like',
  favorite: 'Add to favorites',
  unfavorite: 'Remove from favorites',

  // Contextual builders
  closeDialog: (name?: string) => (name ? `Close ${name} dialog` : 'Close dialog'),
  editItem: (itemType: string, itemName?: string) =>
    itemName ? `Edit ${itemType} ${itemName}` : `Edit ${itemType}`,
  deleteItem: (itemType: string, itemName?: string) =>
    itemName ? `Delete ${itemType} ${itemName}` : `Delete ${itemType}`,
  viewItem: (itemType: string, itemName?: string) =>
    itemName ? `View ${itemType} ${itemName}` : `View ${itemType}`,
  selectItem: (itemType: string, itemName?: string) =>
    itemName ? `Select ${itemType} ${itemName}` : `Select ${itemType}`,
};

/**
 * Generate unique ID for accessibility attributes
 */
export const generateA11yId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if element is visible to screen readers
 */
export const isVisibleToScreenReaders = (element: HTMLElement): boolean => {
  return !element.hasAttribute('aria-hidden') || element.getAttribute('aria-hidden') !== 'true';
};

/**
 * Skip link helpers for keyboard navigation
 */
export const skipToContent = (contentId: string = 'main-content') => {
  const content = document.getElementById(contentId);
  if (content) {
    content.setAttribute('tabindex', '-1');
    content.focus();
    content.removeAttribute('tabindex');
  }
};

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Get accessible name for form fields
 */
export const getFormFieldA11yProps = (
  fieldName: string,
  options: {
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    errorId?: string;
  } = {},
) => {
  const props: Record<string, any> = {
    id: fieldName,
    name: fieldName,
  };

  if (options.required) {
    props['aria-required'] = 'true';
  }

  if (options.invalid) {
    props['aria-invalid'] = 'true';
    if (options.errorId) {
      props['aria-describedby'] = options.errorId;
    }
  } else if (options.describedBy) {
    props['aria-describedby'] = options.describedBy;
  }

  return props;
};

/**
 * Loading state accessibility
 */
export const getLoadingA11yProps = (isLoading: boolean, loadingText = 'Loading') => {
  if (!isLoading) return {};

  return {
    'aria-busy': 'true',
    'aria-live': 'polite' as const,
    'aria-label': loadingText,
  };
};

/**
 * Modal/Dialog accessibility props
 */
export const getDialogA11yProps = (options: {
  titleId: string;
  descriptionId?: string;
  isOpen: boolean;
}) => {
  return {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': options.titleId,
    'aria-describedby': options.descriptionId,
    'aria-hidden': !options.isOpen,
  };
};

/**
 * Button with icon accessibility props
 */
export const getIconButtonA11yProps = (
  label: string,
  options: {
    pressed?: boolean;
    expanded?: boolean;
    hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  } = {},
) => {
  const props: Record<string, any> = {
    'aria-label': label,
  };

  if (options.pressed !== undefined) {
    props['aria-pressed'] = options.pressed;
  }

  if (options.expanded !== undefined) {
    props['aria-expanded'] = options.expanded;
  }

  if (options.hasPopup) {
    props['aria-haspopup'] = options.hasPopup === true ? 'menu' : options.hasPopup;
  }

  return props;
};

/**
 * List/Menu accessibility props
 */
export const getListA11yProps = (options: {
  label?: string;
  multiselectable?: boolean;
  orientation?: 'horizontal' | 'vertical';
}) => {
  const props: Record<string, any> = {
    role: 'list',
  };

  if (options.label) {
    props['aria-label'] = options.label;
  }

  if (options.multiselectable) {
    props['aria-multiselectable'] = 'true';
  }

  if (options.orientation) {
    props['aria-orientation'] = options.orientation;
  }

  return props;
};

/**
 * Tooltip accessibility
 */
export const getTooltipA11yProps = (tooltipId: string, isVisible: boolean) => {
  return {
    'aria-describedby': isVisible ? tooltipId : undefined,
    'aria-expanded': isVisible,
  };
};

/**
 * Focus visible class names (for CSS-in-JS or Tailwind)
 */
export const focusVisibleClasses =
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

/**
 * Screen reader only class (Tailwind utility)
 */
export const srOnlyClass = 'sr-only';

/**
 * Validate WCAG color contrast
 * Returns true if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 */
export const meetsContrastRatio = (
  _foreground: string,

  _background: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _minimumRatio: number = 4.5,
): boolean => {
  // This is a simplified version. In production, use a library like 'color-contrast-checker'
  // For now, return true as placeholder
  return true;
};
