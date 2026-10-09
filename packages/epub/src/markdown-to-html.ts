import type { Transformer } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { Root, RootContent } from 'mdast';
import { remark } from 'remark';
import { resolveImageSrc } from './image-resolver';

const processor = remark()
  .use(remarkGfm)
  .use(remarkResolveImg)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

declare module 'vfile' {
  export interface DataMap {
    pageDir: string;
    publicDir: string;
  }
}

function remarkResolveImg(): Transformer<Root, Root> {
  return (tree, file) => {
    const { pageDir, publicDir } = file.data;
    if (!pageDir || !publicDir) return;

    const visit = (parent: Root | RootContent) => {
      if (!('children' in parent)) return;
      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i];
        if (node.type !== 'image') {
          visit(node);
          continue;
        }

        const resolved = resolveImageSrc(node.url, pageDir, publicDir);
        if (resolved) node.url = resolved;
        else parent.children.splice(i--, 1);
      }
    };
    visit(tree);
  };
}

/**
 * Convert markdown string to HTML suitable for EPUB chapters.
 * Uses unified pipeline: remark-parse -> remark-gfm -> remark-rehype -> rehype-stringify
 */
export async function markdownToHtml(
  markdown: string,
  pageDir: string,
  publicDir: string,
): Promise<string> {
  const result = await processor.process({
    value: markdown,
    data: {
      pageDir,
      publicDir,
    },
  });
  return String(result);
}
