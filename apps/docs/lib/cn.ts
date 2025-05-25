import { defineConfig } from 'cvb';
import { ClassNameValue, twMerge } from 'tailwind-merge';

export const { cvb, svb, cx, compose } = defineConfig({
  hooks: {
    onComplete: (className: ClassNameValue) => twMerge(className), // Resolves Tailwind conflicts
  },
});

export const cn = cx;
