import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client';

export const dataSourceId = '33333333-3333-4333-8333-333333333333';
export const pageId = '22222222-2222-4222-8222-222222222222';

export function richText(
  text: string,
  annotations: Partial<RichTextItemResponse['annotations']> = {},
): RichTextItemResponse {
  return {
    type: 'text',
    text: { content: text, link: null },
    plain_text: text,
    href: null,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
      ...annotations,
    },
  };
}

export function page(
  overrides: Partial<PageObjectResponse> & { id?: string } = {},
): PageObjectResponse {
  return {
    object: 'page',
    id: pageId,
    created_time: '2026-07-01T00:00:00.000Z',
    last_edited_time: '2026-07-02T00:00:00.000Z',
    in_trash: false,
    archived: false,
    is_archived: false,
    is_locked: false,
    url: `https://notion.so/${pageId}`,
    public_url: null,
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
      database_id: '44444444-4444-4444-8444-444444444444',
    },
    properties: {
      Name: {
        id: 'title',
        type: 'title',
        title: [richText('Introduction')],
      },
      Slug: {
        id: 'slug',
        type: 'rich_text',
        rich_text: [richText('guide/introduction')],
      },
      Description: {
        id: 'description',
        type: 'rich_text',
        rich_text: [richText('Start here')],
      },
    },
    icon: { type: 'emoji', emoji: '📘' },
    cover: null,
    created_by: { object: 'user', id: 'user' },
    last_edited_by: { object: 'user', id: 'user' },
    ...overrides,
  } as PageObjectResponse;
}

export function block<T extends BlockObjectResponse>(
  value: Pick<T, 'id' | 'type'> & Record<string, unknown>,
): T {
  return {
    object: 'block',
    created_time: '2026-07-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user' },
    last_edited_time: '2026-07-01T00:00:00.000Z',
    last_edited_by: { object: 'user', id: 'user' },
    has_children: false,
    in_trash: false,
    archived: false,
    parent: { type: 'page_id', page_id: pageId },
    ...value,
  } as T;
}
