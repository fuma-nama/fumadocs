import type { RichTextItemResponse, TextRichTextItemResponse } from '@notionhq/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotionRenderer, NotionRichText } from '../src/renderer';
import type { NotionBlock } from '../src/source';
import { block, richText } from './fixtures';

function codeBlock() {
  return block({
    id: 'code',
    type: 'code',
    code: {
      rich_text: [richText('const answer: number = 42;')],
      caption: [richText('Typed example')],
      language: 'typescript',
    },
  });
}

describe('NotionRenderer', () => {
  it('renders semantic headings, grouped lists, tables, and file URLs', async () => {
    const blocks: NotionBlock[] = [
      block({
        id: 'heading',
        type: 'heading_2',
        heading_2: { rich_text: [richText('Overview')], color: 'default', is_toggleable: false },
      }),
      block({
        id: 'bullet-1',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [richText('First')], color: 'default' },
      }),
      block({
        id: 'bullet-2',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [richText('Second')], color: 'default' },
      }),
      block({
        id: 'table',
        type: 'table',
        has_children: true,
        table: { table_width: 2, has_column_header: true, has_row_header: false },
        children: [
          block({
            id: 'row-1',
            type: 'table_row',
            parent: { type: 'block_id', block_id: 'table' },
            table_row: { cells: [[richText('Name')], [richText('Value')]] },
          }),
          block({
            id: 'row-2',
            type: 'table_row',
            parent: { type: 'block_id', block_id: 'table' },
            table_row: { cells: [[richText('Mode')], [richText('Fast')]] },
          }),
        ],
      }),
      block({
        id: 'image',
        type: 'image',
        image: {
          type: 'file',
          file: { url: 'https://notion.example/temporary', expiry_time: '2026-07-14' },
          caption: [richText('Diagram')],
        },
      }),
    ];

    const html = renderToStaticMarkup(
      await NotionRenderer({ blocks, getFileUrl: () => '/assets/image' }),
    );
    expect(html).toMatch(/<h2[^>]*id="heading"/);
    expect(html.match(/<ul/g)).toHaveLength(1);
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain('<thead>');
    expect(html).toMatch(/<th[^>]*scope="col"/);
    expect(html).toContain('<img alt="Diagram"');
    expect(html).toContain('src="/assets/image"');
  });

  it('renders annotations without client-side JavaScript', () => {
    const linked: RichTextItemResponse & TextRichTextItemResponse = {
      type: 'text',
      plain_text: 'reference',
      href: 'https://example.com',
      text: { content: 'reference', link: { url: 'https://example.com' } },
      annotations: {
        bold: true,
        italic: false,
        strikethrough: false,
        underline: false,
        code: true,
        color: 'blue',
      },
    };

    const html = renderToStaticMarkup(<NotionRichText value={[linked]} />);
    expect(html).toContain('class="text-fd-info" data-notion-color="blue"');
    expect(html).toContain('class="font-medium text-fd-primary underline underline-offset-4"');
    expect(html).toContain('<strong><code class="rounded-md bg-fd-muted');
    expect(html).toContain('>reference</code></strong></a></span>');
  });

  it('leaves uncolored rich text unwrapped', () => {
    const html = renderToStaticMarkup(<NotionRichText value={[richText('Plain')]} />);
    expect(html).toBe('Plain');
  });

  it('renders callout text as content and indents nested children', async () => {
    const callout = block({
      id: 'callout',
      type: 'callout',
      has_children: true,
      callout: { rich_text: [richText('Body text')], color: 'blue_background', icon: null },
      children: [
        block({
          id: 'nested',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Nested')], color: 'default', icon: null },
        }),
      ],
    });
    const html = renderToStaticMarkup(await NotionRenderer({ blocks: [callout] }));

    // the body is content, not a bolded callout title
    expect(html).not.toContain('font-medium my-0!');
    expect(html).toContain('Body text');
    expect(html).toContain('data-notion-color="blue_background"');
    expect(html).toContain('Nested');
  });

  it('indents blocks nested under a paragraph', async () => {
    const paragraph = block({
      id: 'parent',
      type: 'paragraph',
      has_children: true,
      paragraph: { rich_text: [richText('Parent')], color: 'default', icon: null },
      children: [
        block({
          id: 'child',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Child')], color: 'default', icon: null },
        }),
      ],
    });
    const html = renderToStaticMarkup(await NotionRenderer({ blocks: [paragraph] }));

    expect(html).toContain('<div class="ms-5" data-notion-children="">');
  });

  it('supports type-safe component overrides', async () => {
    const callout = block({
      id: 'callout',
      type: 'callout',
      callout: { rich_text: [richText('Note')], color: 'blue_background', icon: null },
    });
    const html = renderToStaticMarkup(
      await NotionRenderer({
        blocks: [callout],
        components: {
          callout({ block }) {
            return (
              <section data-custom-callout="">{block.callout.rich_text[0]?.plain_text}</section>
            );
          },
        },
      }),
    );

    expect(html).toContain('<section data-custom-callout="">Note</section>');
    expect(html).not.toContain('data-notion-block="callout"');
  });

  it('highlights code on the server and labels its language', async () => {
    const html = renderToStaticMarkup(await NotionRenderer({ blocks: [codeBlock()] }));

    expect(html).toContain('data-notion-block="code"');
    expect(html).toContain('data-notion-language="typescript"');
    expect(html).toContain('shiki shiki-themes');
    expect(html).toContain('--shiki-dark');
    expect(html).toContain('Typed example');
  });

  it('renders plain code when highlighting is disabled', async () => {
    const html = renderToStaticMarkup(
      await NotionRenderer({ blocks: [codeBlock()], highlightCode: false }),
    );

    expect(html).toContain('data-notion-block="code"');
    expect(html).toContain('const answer: number = 42;');
    expect(html).not.toContain('shiki shiki-themes');
  });

  it('defers to a custom highlighter, awaiting async ones', async () => {
    const html = renderToStaticMarkup(
      await NotionRenderer({
        blocks: [codeBlock()],
        highlightCode: async (code, language) =>
          Promise.resolve(<span data-custom-highlight={language}>{code}</span>),
      }),
    );

    expect(html).toContain('data-custom-highlight="typescript"');
    expect(html).toContain('const answer: number = 42;');
    expect(html).not.toContain('shiki shiki-themes');
  });

  it('renders tabs, safe embeds, file cards, and meeting metadata', async () => {
    const tabs = block({
      id: 'tabs',
      type: 'tab',
      has_children: true,
      tab: {},
      children: [
        block({
          id: 'overview',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Overview')], color: 'default', icon: null },
          children: [
            block({
              id: 'overview-content',
              type: 'paragraph',
              paragraph: { rich_text: [richText('First panel')], color: 'default', icon: null },
            }),
          ],
        }),
        block({
          id: 'details',
          type: 'paragraph',
          paragraph: { rich_text: [richText('Details')], color: 'default', icon: null },
          children: [
            block({
              id: 'details-content',
              type: 'paragraph',
              paragraph: { rich_text: [richText('Second panel')], color: 'default', icon: null },
            }),
          ],
        }),
      ],
    });
    const embed = block({
      id: 'embed',
      type: 'embed',
      embed: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: [] },
    });
    const file = block({
      id: 'file',
      type: 'file',
      file: {
        type: 'external',
        external: { url: 'https://example.com/guide.pdf' },
        name: 'Guide.pdf',
        caption: [],
      },
    });
    const meeting = block({
      id: 'meeting',
      type: 'meeting_notes',
      meeting_notes: {
        title: [richText('Team sync')],
        status: 'notes_ready',
        calendar_event: {
          start_time: '2026-07-14T09:00:00.000Z',
          end_time: '2026-07-14T09:30:00.000Z',
        },
      },
    });
    const html = renderToStaticMarkup(
      await NotionRenderer({ blocks: [tabs, embed, file, meeting] }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('First panel');
    expect(html).toContain('Second panel');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(html).toContain('data-notion-link-kind="file"');
    expect(html).toContain('Guide.pdf');
    expect(html).toContain('Team sync');
    expect(html).toContain('notes ready');
  });
});
