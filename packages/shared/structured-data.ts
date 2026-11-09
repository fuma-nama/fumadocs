import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';

/** structured data rendered for the props of a page: content is trimmed, empty records are left out */
export function trimStructuredData({ headings, contents }: StructuredData): StructuredData {
  function trim<T extends { content: string }>(list: T[]): T[] {
    const out: T[] = [];
    for (const item of list) {
      const content = item.content.trim();
      if (content) out.push({ ...item, content });
    }
    return out;
  }

  return { headings: trim(headings), contents: trim(contents) };
}
