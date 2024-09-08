import Slugger from 'github-slugger';
import type { Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Transformer } from 'unified';
import { visit, type Test } from 'unist-util-visit';
import { flattenNode } from './remark-utils';

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
   * Refer to paragraphs, a heading may contain multiple contents as well
   */
  contents: Content[];
}

export interface StructureOptions {
  /**
   * Types to be scanned.
   *
   * @defaultValue ['paragraph', 'blockquote', 'heading', 'tableCell']
   */
  types?: Test;
}

const slugger = new Slugger();

/**
 * Attach structured data to VFile, you can access via `vfile.data.structuredData`.
 */
export function remarkStructure({
  types = ['paragraph', 'blockquote', 'heading', 'tableCell'],
}: StructureOptions = {}): Transformer<Root, Root> {
  return (node, file) => {
    slugger.reset();
    const data: StructuredData = { contents: [], headings: [] };
    let lastHeading: string | undefined = '';

    // Fumadocs OpenAPI Generated Structured Data
    if (file.data.frontmatter) {
      const frontmatter = file.data.frontmatter as {
        _openapi?: {
          structuredData?: StructuredData;
        };
      };

      if (frontmatter._openapi?.structuredData) {
        data.headings.push(...frontmatter._openapi.structuredData.headings);
        data.contents.push(...frontmatter._openapi.structuredData.contents);
      }
    }

    visit(node, types, (element) => {
      if (element.type === 'root') return;
      const content = flattenNode(element).trim();

      if (element.type === 'heading') {
        element.data ||= {};
        element.data.hProperties ||= {};
        const properties = element.data.hProperties;
        const id = properties.id ?? slugger.slug(content);

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

        return 'skip';
      }
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
  options: StructureOptions = {},
): StructuredData {
  const result = remark()
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkStructure, options)
    .processSync(content);

  return result.data.structuredData as StructuredData;
}
