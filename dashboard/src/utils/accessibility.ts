// Accessibility utilities for keyboard navigation and ARIA support

export interface FocusableElement extends HTMLElement {
  focus(): void;
  blur(): void;
}

// Selectors for focusable elements
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
  '[role="link"]:not([disabled])',
  '[role="menuitem"]:not([disabled])',
  '[role="tab"]:not([disabled])',
  '[role="option"]:not([disabled])',
  'details summary',
  'audio[controls]',
  'video[controls]',
].join(', ');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement = document.body
): FocusableElement[] {
  const elements = Array.from(
    container.querySelectorAll(FOCUSABLE_SELECTORS)
  ) as FocusableElement[];

  return elements.filter((element) => {
    // Check if element is visible and not hidden
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      !element.hasAttribute('aria-hidden')
    );
  });
}

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: FocusableElement[];
  private firstFocusableElement: FocusableElement | null = null;
  private lastFocusableElement: FocusableElement | null = null;
  private previouslyFocusedElement: Element | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.focusableElements = [];
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    this.focusableElements = getFocusableElements(this.container);
    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement =
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };

  activate() {
    this.previouslyFocusedElement = document.activeElement;
    this.container.addEventListener('keydown', this.handleKeyDown);

    // Focus the first focusable element
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }
  }

  deactivate() {
    this.container.removeEventListener('keydown', this.handleKeyDown);

    // Return focus to previously focused element
    if (
      this.previouslyFocusedElement &&
      'focus' in this.previouslyFocusedElement
    ) {
      (this.previouslyFocusedElement as FocusableElement).focus();
    }
  }
}

/**
 * Keyboard navigation for lists and grids
 */
export class KeyboardNavigator {
  private container: HTMLElement;
  private items: HTMLElement[];
  private currentIndex: number = 0;
  private orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical';
  private gridColumns: number = 1;

  constructor(
    container: HTMLElement,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'grid';
      gridColumns?: number;
      itemSelector?: string;
    } = {}
  ) {
    this.container = container;
    this.orientation = options.orientation || 'vertical';
    this.gridColumns = options.gridColumns || 1;

    const itemSelector =
      options.itemSelector ||
      '[role="option"], [role="menuitem"], [role="tab"], .nav-item';
    this.items = Array.from(
      container.querySelectorAll(itemSelector)
    ) as HTMLElement[];

    this.init();
  }

  private init() {
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.container.addEventListener('click', this.handleClick);

    // Set initial focus
    this.updateFocus();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;
    let handled = false;

    switch (key) {
      case 'ArrowDown':
        if (this.orientation === 'vertical' || this.orientation === 'grid') {
          this.moveDown();
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (this.orientation === 'vertical' || this.orientation === 'grid') {
          this.moveUp();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (this.orientation === 'horizontal' || this.orientation === 'grid') {
          this.moveRight();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (this.orientation === 'horizontal' || this.orientation === 'grid') {
          this.moveLeft();
          handled = true;
        }
        break;
      case 'Home':
        this.moveToFirst();
        handled = true;
        break;
      case 'End':
        this.moveToLast();
        handled = true;
        break;
      case 'Enter':
      case ' ':
        this.activateCurrentItem();
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private handleClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const index = this.items.indexOf(target);

    if (index !== -1) {
      this.currentIndex = index;
      this.updateFocus();
    }
  };

  private moveDown() {
    if (this.orientation === 'grid') {
      const newIndex = this.currentIndex + this.gridColumns;
      if (newIndex < this.items.length) {
        this.currentIndex = newIndex;
      }
    } else {
      this.currentIndex = Math.min(
        this.currentIndex + 1,
        this.items.length - 1
      );
    }
    this.updateFocus();
  }

  private moveUp() {
    if (this.orientation === 'grid') {
      const newIndex = this.currentIndex - this.gridColumns;
      if (newIndex >= 0) {
        this.currentIndex = newIndex;
      }
    } else {
      this.currentIndex = Math.max(this.currentIndex - 1, 0);
    }
    this.updateFocus();
  }

  private moveRight() {
    if (this.orientation === 'grid') {
      const row = Math.floor(this.currentIndex / this.gridColumns);
      const col = this.currentIndex % this.gridColumns;
      if (col < this.gridColumns - 1) {
        const newIndex = row * this.gridColumns + col + 1;
        if (newIndex < this.items.length) {
          this.currentIndex = newIndex;
        }
      }
    } else {
      this.currentIndex = Math.min(
        this.currentIndex + 1,
        this.items.length - 1
      );
    }
    this.updateFocus();
  }

  private moveLeft() {
    if (this.orientation === 'grid') {
      const row = Math.floor(this.currentIndex / this.gridColumns);
      const col = this.currentIndex % this.gridColumns;
      if (col > 0) {
        this.currentIndex = row * this.gridColumns + col - 1;
      }
    } else {
      this.currentIndex = Math.max(this.currentIndex - 1, 0);
    }
    this.updateFocus();
  }

  private moveToFirst() {
    this.currentIndex = 0;
    this.updateFocus();
  }

  private moveToLast() {
    this.currentIndex = this.items.length - 1;
    this.updateFocus();
  }

  private activateCurrentItem() {
    const currentItem = this.items[this.currentIndex];
    if (currentItem) {
      // Trigger click event
      currentItem.click();
    }
  }

  private updateFocus() {
    // Remove tabindex from all items
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
      item.setAttribute(
        'aria-selected',
        index === this.currentIndex ? 'true' : 'false'
      );
    });

    // Focus current item
    const currentItem = this.items[this.currentIndex];
    if (currentItem) {
      currentItem.focus();
    }
  }

  public setCurrentIndex(index: number) {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.updateFocus();
    }
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public destroy() {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.container.removeEventListener('click', this.handleClick);
  }
}

/**
 * ARIA live region announcer
 */
export class LiveAnnouncer {
  private liveRegion: HTMLElement;

  constructor() {
    this.liveRegion = this.createLiveRegion();
  }

  private createLiveRegion(): HTMLElement {
    const existing = document.getElementById('live-announcer');
    if (existing) {
      return existing;
    }

    const liveRegion = document.createElement('div');
    liveRegion.id = 'live-announcer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';

    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.liveRegion.setAttribute('aria-live', priority);

    // Clear and then set the message to ensure it's announced
    this.liveRegion.textContent = '';

    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);
  }

  clear() {
    this.liveRegion.textContent = '';
  }
}

// Global live announcer instance
export const liveAnnouncer = new LiveAnnouncer();

/**
 * Skip link functionality
 */
export function addSkipLinks() {
  const skipLinks = [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#footer', text: 'Skip to footer' },
  ];

  const skipContainer = document.createElement('div');
  skipContainer.className = 'skip-links';

  skipLinks.forEach((link) => {
    const skipLink = document.createElement('a');
    skipLink.href = link.href;
    skipLink.textContent = link.text;
    skipLink.className = 'skip-link';
    skipContainer.appendChild(skipLink);
  });

  document.body.insertBefore(skipContainer, document.body.firstChild);
}

/**
 * Enhanced focus management
 */
export function manageFocus() {
  let isUsingKeyboard = false;

  // Track keyboard usage
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('using-keyboard');
    }
  });

  // Track mouse usage
  document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('using-keyboard');
  });

  // Add focus-visible polyfill behavior
  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement;
    if (isUsingKeyboard) {
      target.classList.add('focus-visible');
    }
  });

  document.addEventListener('focusout', (event) => {
    const target = event.target as HTMLElement;
    target.classList.remove('focus-visible');
  });
}

/**
 * Accessible modal management
 */
export function createAccessibleModal(
  modalElement: HTMLElement,
  options: {
    closeOnEscape?: boolean;
    closeOnBackdropClick?: boolean;
    returnFocus?: boolean;
  } = {}
) {
  const {
    closeOnEscape = true,
    closeOnBackdropClick = true,
    returnFocus = true,
  } = options;

  let focusTrap: FocusTrap | null = null;
  let previouslyFocusedElement: Element | null = null;

  const open = () => {
    previouslyFocusedElement = document.activeElement;

    // Set ARIA attributes
    modalElement.setAttribute('aria-modal', 'true');
    modalElement.setAttribute('role', 'dialog');

    // Create focus trap
    focusTrap = new FocusTrap(modalElement);
    focusTrap.activate();

    // Add event listeners
    if (closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
    }

    if (closeOnBackdropClick) {
      modalElement.addEventListener('click', handleBackdropClick);
    }

    // Announce modal opening
    liveAnnouncer.announce('Dialog opened');
  };

  const close = () => {
    // Remove event listeners
    document.removeEventListener('keydown', handleEscape);
    modalElement.removeEventListener('click', handleBackdropClick);

    // Deactivate focus trap
    if (focusTrap) {
      focusTrap.deactivate();
      focusTrap = null;
    }

    // Return focus
    if (
      returnFocus &&
      previouslyFocusedElement &&
      'focus' in previouslyFocusedElement
    ) {
      (previouslyFocusedElement as FocusableElement).focus();
    }

    // Remove ARIA attributes
    modalElement.removeAttribute('aria-modal');

    // Announce modal closing
    liveAnnouncer.announce('Dialog closed');
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === modalElement) {
      close();
    }
  };

  return { open, close };
}

/**
 * Accessible tooltip management
 */
export function createAccessibleTooltip(
  triggerElement: HTMLElement,
  tooltipContent: string,
  options: {
    placement?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
  } = {}
) {
  const { placement = 'top', delay = 500 } = options;

  let tooltip: HTMLElement | null = null;
  let showTimeout: number | null = null;
  let hideTimeout: number | null = null;

  const show = () => {
    if (tooltip) return;

    tooltip = document.createElement('div');
    tooltip.textContent = tooltipContent;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.className = `tooltip tooltip-${placement}`;
    tooltip.id = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

    document.body.appendChild(tooltip);

    // Set ARIA relationship
    triggerElement.setAttribute('aria-describedby', tooltip.id);

    // Position tooltip (simplified positioning)
    const rect = triggerElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    switch (placement) {
      case 'top':
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
        break;
      case 'bottom':
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;
        break;
      case 'left':
        tooltip.style.left = `${rect.left - tooltipRect.width - 8}px`;
        tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        break;
      case 'right':
        tooltip.style.left = `${rect.right + 8}px`;
        tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        break;
    }
  };

  const hide = () => {
    if (tooltip) {
      triggerElement.removeAttribute('aria-describedby');
      document.body.removeChild(tooltip);
      tooltip = null;
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    showTimeout = window.setTimeout(show, delay);
  };

  const handleMouseLeave = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    hideTimeout = window.setTimeout(hide, 100);
  };

  const handleFocus = () => {
    show();
  };

  const handleBlur = () => {
    hide();
  };

  // Add event listeners
  triggerElement.addEventListener('mouseenter', handleMouseEnter);
  triggerElement.addEventListener('mouseleave', handleMouseLeave);
  triggerElement.addEventListener('focus', handleFocus);
  triggerElement.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    triggerElement.removeEventListener('mouseenter', handleMouseEnter);
    triggerElement.removeEventListener('mouseleave', handleMouseLeave);
    triggerElement.removeEventListener('focus', handleFocus);
    triggerElement.removeEventListener('blur', handleBlur);
    hide();
  };
}

/**
 * Initialize accessibility features
 */
export function initializeAccessibility() {
  // Add skip links
  addSkipLinks();

  // Manage focus
  manageFocus();

  // Add keyboard navigation support to common elements
  const navigationElements = document.querySelectorAll(
    '[role="navigation"] ul, .nav-menu'
  );
  navigationElements.forEach((nav) => {
    new KeyboardNavigator(nav as HTMLElement, {
      orientation: 'vertical',
      itemSelector: 'a, button, [role="menuitem"]',
    });
  });

  // Add grid navigation to server grids
  const serverGrids = document.querySelectorAll('.server-grid');
  serverGrids.forEach((grid) => {
    new KeyboardNavigator(grid as HTMLElement, {
      orientation: 'grid',
      gridColumns: 3, // Adjust based on your grid layout
      itemSelector: '.server-card',
    });
  });

  console.log('Accessibility features initialized');
}
