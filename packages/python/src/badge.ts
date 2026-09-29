import { cva } from 'class-variance-authority';

export const badgeVariants = cva('text-xs font-medium border p-1 rounded-lg not-prose', {
  variants: {
    color: {
      func: 'bg-fdpy-func/10 text-fdpy-func border-fdpy-func/50',
      attribute: 'bg-fdpy-attribute/10 text-fdpy-attribute border-fdpy-attribute/50',
      class: 'bg-fdpy-class/10 text-fdpy-class border-fdpy-class/50',
      module: 'bg-fdpy-module/10 text-fdpy-module border-fdpy-module/50',
      primary: 'bg-fd-primary/10 text-fd-primary border-fd-primary/10',
    },
  },
});
