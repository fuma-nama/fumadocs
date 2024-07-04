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

export const itemVariants = cva(
  'flex w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors duration-100 [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-primary/10 font-medium text-primary',
        false:
          'hover:bg-accent/50 hover:text-accent-foreground/80 hover:transition-none',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);
