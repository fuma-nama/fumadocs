export const animations = {
  keyframes: {
    'fd-collapsible-down': {
      from: { height: '0', opacity: '0' },
      to: {
        height: 'var(--radix-collapsible-content-height)',
      },
    },
    'fd-collapsible-up': {
      from: {
        height: 'var(--radix-collapsible-content-height)',
      },
      to: { height: '0', opacity: '0' },
    },
    'fd-accordion-down': {
      from: { height: '0', opacity: '0.5' },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'fd-accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: '0', opacity: '0.5' },
    },
    'fd-dialog-in': {
      from: { transform: 'scale(0.95) translate(-50%, 0)', opacity: '0' },
      to: { transform: 'scale(1) translate(-50%, 0)' },
    },
    'fd-dialog-out': {
      from: { transform: 'scale(1) translate(-50%, 0)' },
      to: { transform: 'scale(0.95) translateY(-50%, 0)', opacity: '0' },
    },
    'fd-popover-in': {
      from: { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
      to: { opacity: '1', transform: 'scale(1) translateY(0)' },
    },
    'fd-popover-out': {
      from: { opacity: '1', transform: 'scale(1) translateY(0)' },
      to: { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
    },
    'fd-fade-in': {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    'fd-fade-out': {
      to: { opacity: '0' },
    },

    'fd-enterFromRight': {
      from: { opacity: '0', transform: 'translateX(200px)' },
      to: { opacity: '1', transform: 'translateX(0)' },
    },
    'fd-enterFromLeft': {
      from: { opacity: '0', transform: 'translateX(-200px)' },
      to: { opacity: '1', transform: 'translateX(0)' },
    },
    'fd-exitToRight': {
      from: { opacity: '1', transform: 'translateX(0)' },
      to: { opacity: '0', transform: 'translateX(200px)' },
    },
    'fd-exitToLeft': {
      from: { opacity: '1', transform: 'translateX(0)' },
      to: { opacity: '0', transform: 'translateX(-200px)' },
    },
    'fd-nav-menu-in': {
      from: { opacity: '0', height: '0px' },
      to: {
        opacity: '1',
        height: 'var(--radix-navigation-menu-viewport-height)',
      },
    },
    'fd-nav-menu-out': {
      from: {
        opacity: '1',
        height: 'var(--radix-navigation-menu-viewport-height)',
      },
      to: { opacity: '0', height: '0px' },
    },
  },
  animation: {
    'fd-fade-in': 'fd-fade-in 300ms ease',
    'fd-fade-out': 'fd-fade-out 300ms ease',
    'fd-dialog-in': 'fd-dialog-in 200ms cubic-bezier(0.32, 0.72, 0, 1)',
    'fd-dialog-out': 'fd-dialog-out 300ms cubic-bezier(0.32, 0.72, 0, 1)',
    'fd-popover-in': 'fd-popover-in 150ms ease',
    'fd-popover-out': 'fd-popover-out 150ms ease',
    'fd-collapsible-down': 'fd-collapsible-down 150ms ease-out',
    'fd-collapsible-up': 'fd-collapsible-up 150ms ease-out',
    'fd-accordion-down': 'fd-accordion-down 200ms ease-out',
    'fd-accordion-up': 'fd-accordion-up 200ms ease-out',

    'fd-nav-menu-in': 'fd-nav-menu-in 200ms ease',
    'fd-nav-menu-out': 'fd-nav-menu-out 200ms ease',

    'fd-enterFromLeft': 'fd-enterFromLeft 250ms ease',
    'fd-enterFromRight': 'fd-enterFromRight 250ms ease',
    'fd-exitToLeft': 'fd-exitToLeft 250ms ease',
    'fd-exitToRight': 'fd-exitToRight 250ms ease',
  },
};
