import type { ReactNode } from 'react';
import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';

/** structured data whose content renders from code, from `remarkStructure` for pages that read their props */
export interface StructuredDataNodes {
  headings: { id: string; content: ReactNode }[];
  contents: (Omit<StructuredDataContent, 'content'> & { content: ReactNode })[];
}

/** the structured data of a page at props, content rendered from code becomes Markdown, empty records are left out */
export async function renderStructuredData<Props extends object>(
  data: StructuredDataNodes | ((props: Props) => StructuredDataNodes),
  props = {} as Props,
): Promise<StructuredData> {
  const { renderToMarkdown } = await import('fumadocs-core/server');
  const { headings, contents } = typeof data === 'function' ? data(props) : data;
  async function render<T extends { content: ReactNode }>(list: T[]) {
    const out: (T & { content: string })[] = [];
    const rendered = await Promise.all(
      list.map((item) =>
        typeof item.content === 'string' ? item.content : renderToMarkdown(item.content),
      ),
    );
    for (let i = 0; i < list.length; i++) {
      const content = rendered[i].trim();
      if (content) out.push({ ...list[i], content });
    }
    return out;
  }

  return { headings: await render(headings), contents: await render(contents) };
}
