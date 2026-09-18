import { cva } from 'class-variance-authority';

export const labelVariants = cva(
  'text-xs font-medium text-fd-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);
