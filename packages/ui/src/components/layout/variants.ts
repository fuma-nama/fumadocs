import { cva } from 'class-variance-authority';

export const itemVariants = cva([
  'flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] [&_svg]:size-4',
  'data-[active=false]:hover:bg-fd-accent/50 data-[active=false]:hover:text-fd-accent-foreground/80 data-[active=false]:hover:transition-none',
  'data-[active=true]:bg-fd-primary/10 data-[active=true]:font-medium data-[active=true]:text-fd-primary',
]);
