import { cva } from 'class-variance-authority';

export const itemVariants = cva([
  'flex w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] [&_svg]:size-4',
  'hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
  'data-[active=true]:!bg-fd-primary/10 data-[active=true]:font-medium data-[active=true]:!text-fd-primary data-[active=true]:hover:transition-colors',
]);
