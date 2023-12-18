import { extendTailwindMerge } from 'tailwind-merge';

export const cn = extendTailwindMerge<string, string>({
  extend: {
    classGroups: {
      'font-size': [{ text: ['medium'] }],
    },
  },
});
