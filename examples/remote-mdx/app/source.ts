import type { PageTree } from 'fumadocs-core/server';

export const pageTree: PageTree.Root = {
  name: 'Docs',
  children: [
    {
      type: 'page',
      name: 'Page',
      url: '/docs',
    },
    {
      type: 'page',
      name: 'Test',
      url: '/docs/test',
    },
  ],
};

export const pages = [
  {
    param: '',
    info: {
      title: 'Hello World',
    },
    content: `# Hello World
\`\`\`js
console.log("HELLO");
\`\`\``,
  },
  {
    param: 'test',
    info: {
      title: 'Test',
    },
    content: `# Test

Hey!`,
  },
];
