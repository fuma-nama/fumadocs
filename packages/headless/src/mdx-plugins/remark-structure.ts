import Slugger from 'github-slugger';
import type { RootContent as MdastContent, Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import type { PluggableList, Transformer } from 'unified';
import { visit } from './unist-visit';
import { flattenNode } from './remark-utils';
import type { HProperties } from './remark-heading';

interface Heading {
  id: string;
  content: string;
}

interface Content {
  heading: string | undefined;
  content: string;
}

export interface StructuredData {
  headings: Heading[];
  /**
   * Refer to paragraphs, a heading may contains multiple contents as well
   */
  contents: Content[];
}

interface Options {
  /**
   * Types to be scanned, default: `["heading", "blockquote", "paragraph"]`
   */
  types?: string[];
}

const slugger = new Slugger();

/**
 * Attach structured data to VFile, you can access via `vfile.data.structuredData`.
 */
export function remarkStructure({
  types = ['paragraph', 'blockquote', 'heading'],
}: Options = {}): Transformer<Root, Root> {
  return (node, file) => {
    slugger.reset();
    const data: StructuredData = { contents: [], headings: [] };
    let lastHeading: string | undefined = '';

    visit(node, types, (element: MdastContent) => {
      const content = flattenNode(element).trim();

      if (element.type === 'heading') {
        element.data ||= {};
        element.data.hProperties ||= {};
        const propeties = element.data.hProperties as HProperties;
        const id = propeties.id ?? slugger.slug(content);

        data.headings.push({
          id,
          content,
        });

        lastHeading = id;
        return 'skip';
      }

      if (content.length > 0) {
        data.contents.push({
          heading: lastHeading,
          content,
        });
      }

      return 'skip';
    });

    file.data.structuredData = data;
  };
}

/**
 * Extract data from markdown/mdx content
 */
export function structure(
  content: string,
  remarkPlugins: PluggableList = [],
  options: Options = {},
): StructuredData {
  const result = remark()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkPlugins)
    .use(remarkStructure, options)
    .processSync(content);

  return result.data.structuredData as StructuredData;
}
