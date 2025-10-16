import {
  create,
  insertMultiple,
  type Orama,
  type PartialSchemaDeep,
  type TypedDocument,
} from '@orama/orama';
import { type AdvancedOptions, type SimpleOptions } from '@/search/server';

export type SimpleDocument = TypedDocument<Orama<typeof simpleSchema>>;
export const simpleSchema = {
  url: 'string',
  title: 'string',
  breadcrumbs: 'string[]',
  description: 'string',
  content: 'string',
  keywords: 'string',
} as const;

export type AdvancedDocument = TypedDocument<Orama<typeof advancedSchema>>;
export const advancedSchema = {
  content: 'string',
  page_id: 'string',
  type: 'string',
  breadcrumbs: 'string[]',
  tags: 'enum[]',
  url: 'string',
  embeddings: 'vector[512]',
} as const;

export async function createDB({
  indexes,
  tokenizer,
  search: _,
  ...rest
}: AdvancedOptions): Promise<Orama<typeof advancedSchema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;

  const db = create({
    schema: advancedSchema,
    ...rest,
    components: {
      ...rest.components,
      tokenizer: tokenizer ?? rest.components?.tokenizer,
    },
  }) as Orama<typeof advancedSchema>;

  const mapTo: PartialSchemaDeep<AdvancedDocument>[] = [];
  items.forEach((page) => {
    const pageTag = page.tag ?? [];
    const tags = Array.isArray(pageTag) ? pageTag : [pageTag];
    const data = page.structuredData;
    let id = 0;

    mapTo.push({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      breadcrumbs: page.breadcrumbs,
      tags,
      url: page.url,
    });

    const nextId = () => `${page.id}-${id++}`;

    if (page.description) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: page.url,
        content: page.description,
      });
    }

    for (const heading of data.headings) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        type: 'heading',
        tags,
        url: `${page.url}#${heading.id}`,
        content: heading.content,
      });
    }

    for (const content of data.contents) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: content.heading ? `${page.url}#${content.heading}` : page.url,
        content: content.content,
      });
    }
  });

  await insertMultiple(db, mapTo);
  return db;
}

export async function createDBSimple({
  indexes,
  tokenizer,
  ...rest
}: SimpleOptions): Promise<Orama<typeof simpleSchema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;
  const db = create({
    schema: simpleSchema,
    ...rest,
    components: {
      ...rest.components,
      tokenizer: tokenizer ?? rest.components?.tokenizer,
    },
  }) as Orama<typeof simpleSchema>;

  await insertMultiple(
    db,
    items.map((page) => ({
      title: page.title,
      description: page.description,
      breadcrumbs: page.breadcrumbs,
      url: page.url,
      content: page.content,
      keywords: page.keywords,
    })),
  );

  return db;
}
