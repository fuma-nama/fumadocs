import {
  defineDocs,
  defineCollections,
  frontmatterSchema,
  defineConfig,
} from 'fumadocs-mdx/config';
import { z } from 'zod';
import { remark } from 'remark';
import {
  rehypeCode,
  remarkGfm,
  remarkHeading,
  remarkImage,
} from 'fumadocs-core/mdx-plugins';
import remarkRehype from 'remark-rehype';

const processor = remark()
  .use(remarkGfm)
  .use(remarkImage, { useImport: false })
  .use(remarkHeading)
  .use(remarkRehype)
  .use(rehypeCode);

export const { docs, meta } = defineDocs({
  docs: {
    schema: frontmatterSchema.transform(async (v) => {
      const parsed = processor.parse(v.description);
      const hast = await processor.run(parsed);

      return {
        ...v,
        descriptionHast: hast,
        test: 'goodbye',
      };
    }),
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: './content/blog',
  schema: z.object({
    title: z.string(),
  }),
});

export default defineConfig({
  mdxOptions: {},
});
