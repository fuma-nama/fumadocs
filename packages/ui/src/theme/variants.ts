import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      color: {
        outline: 'border hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        secondary:
          'border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        icon: 'p-1.5 [&_svg]:size-5',
      },
    },
  },
);
