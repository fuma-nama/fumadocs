import {
  create,
  insertMultiple,
  type Orama,
  type PartialSchemaDeep,
  type TypedDocument,
} from '@orama/orama';
import { type AdvancedOptions } from '@/search/server';

export type AdvancedDocument = TypedDocument<Orama<typeof advancedSchema>>;
export const advancedSchema = {
  content: 'string',
  page_id: 'string',
  type: 'string',
  keywords: 'string',
  tag: 'string',
  url: 'string',
} as const;

export async function createDB({
  indexes,
  tokenizer,
  search: _,
  ...rest
}: AdvancedOptions): Promise<Orama<typeof advancedSchema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;

  const db = await create({
    ...rest,
    schema: advancedSchema,
    components: {
      tokenizer: tokenizer ?? {
        stemmerSkipProperties: ['tag', 'url', 'page_id', 'type'],
      },
    },
  });

  const mapTo: PartialSchemaDeep<AdvancedDocument>[] = [];
  items.forEach((page) => {
    const data = page.structuredData;
    let id = 0;

    mapTo.push({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      keywords: page.keywords,
      tag: page.tag,
      url: page.url,
    });

    if (page.description) {
      mapTo.push({
        id: `${page.id}-${(id++).toString()}`,
        page_id: page.id,
        tag: page.tag,
        type: 'text',
        url: page.url,
        content: page.description,
      });
    }

    for (const heading of data.headings) {
      mapTo.push({
        id: `${page.id}-${(id++).toString()}`,
        page_id: page.id,
        type: 'heading',
        tag: page.tag,
        url: `${page.url}#${heading.id}`,
        content: heading.content,
      });
    }

    for (const content of data.contents) {
      mapTo.push({
        id: `${page.id}-${(id++).toString()}`,
        page_id: page.id,
        tag: page.tag,
        type: 'text',
        url: content.heading ? `${page.url}#${content.heading}` : page.url,
        content: content.content,
      });
    }
  });

  await insertMultiple(db, mapTo);
  return db;
}
