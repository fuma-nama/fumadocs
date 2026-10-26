import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';

// MDX components of docs, they are rendered and hydrated by the Fumadocs integration
export default {
  ...defaultMdxComponents,
  wrapper: DocsBody,
};
