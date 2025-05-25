import { defineConfig } from 'cvb';
import { twMerge } from 'tailwind-merge';

export const { cvb, svb, cx, compose } = defineConfig({
  hooks: {
    onComplete: (className: string) => twMerge(className), // Resolves Tailwind conflicts
  },
});

export const cn = cx;
