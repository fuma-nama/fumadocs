import { type ShikiTransformer } from 'shiki';

export const sharedTransformers: ShikiTransformer[] = [
  {
    name: 'fumadocs:pre-process',
    line(hast) {
      if (hast.children.length === 0) {
        // Keep the empty lines when using grid layout
        hast.children.push({
          type: 'text',
          value: ' ',
        });
      }
    },
  },
];
