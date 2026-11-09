import { defineDocs } from 'fumadocs-mdx/macro';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    analysis: 'runtime',
    async: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});
