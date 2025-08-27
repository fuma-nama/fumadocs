import type { Transformer } from 'unified';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

declare module 'vfile' {
  interface DataMap {
    extractedReferences: ExtractedReference[];
  }
}

export interface ExtractedReference {
  href: string;
}

export function remarkExtract(): Transformer<Root, Root> {
  return (tree, file) => {
    const urls: ExtractedReference[] = [];
    visit(tree, 'link', (node) => {
      urls.push({
        href: node.url,
      });

      return 'skip';
    });

    file.data.extractedReferences = urls;
  };
}
