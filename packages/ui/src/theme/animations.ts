export const animations = {
  keyframes: {
    'collapsible-down': {
      from: { height: '0', opacity: '0' },
      to: {
        height: 'var(--radix-collapsible-content-height)',
      },
    },
    'collapsible-up': {
      from: {
        height: 'var(--radix-collapsible-content-height)',
      },
      to: { height: '0', opacity: '0' },
    },
    'accordion-down': {
      from: { height: '0', opacity: '0.5' },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: '0', opacity: '0.5' },
    },
    'dialog-in': {
      from: { transform: 'scale(0.95) translateY(-4rem)' },
      to: { transform: 'scale(1) translateY(0)' },
    },
    'drawer-in': {
      from: { transform: 'translateY(100%)' },
    },
    'drawer-out': {
      to: { transform: 'translateY(100%)' },
    },
    'dialog-out': {
      from: { transform: 'scale(1) translateY(0)' },
      to: { transform: 'scale(0.95) translateY(-4rem)' },
    },
    'popover-in': {
      from: { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
      to: { opacity: '1', transform: 'scale(1) translateY(0)' },
    },
    'popover-out': {
      from: { opacity: '1', transform: 'scale(1) translateY(0)' },
      to: { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
    },
    'fade-in': {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    'fade-out': {
      to: { opacity: '0' },
    },
  },
  animation: {
    'fade-in': 'fade-in 300ms ease',
    'fade-out': 'fade-out 300ms ease',
    'dialog-in': 'dialog-in 150ms ease',
    'dialog-out': 'dialog-out 200ms ease',
    'drawer-in': 'drawer-in 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
    'drawer-out': 'drawer-out 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
    'popover-in': 'popover-in 150ms ease',
    'popover-out': 'popover-out 150ms ease',
    'collapsible-down': 'collapsible-down 150ms ease-out',
    'collapsible-up': 'collapsible-up 150ms ease-out',
    'accordion-down': 'accordion-down 200ms ease-out',
    'accordion-up': 'accordion-up 200ms ease-out',
  },
};
