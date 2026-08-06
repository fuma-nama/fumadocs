import {
  create,
  insertMultiple,
  type PartialSchemaDeep,
  type TypedDocument,
  type ZBSearch,
} from 'zbsearch';
import { type AdvancedOptions, type SimpleOptions } from '@/search/server';
import { buildDocuments } from '../server/build-doc';

export type SimpleDocument = TypedDocument<ZBSearch<typeof simpleSchema>>;
export const simpleSchema = {
  url: 'string',
  title: 'string',
  breadcrumbs: 'string[]',
  description: 'string',
  content: 'string',
  keywords: 'string',
  locale: 'enum',
} as const;

export type AdvancedDocument = TypedDocument<ZBSearch<typeof advancedSchema>>;
export const advancedSchema = {
  content: 'string',
  page_id: 'string',
  type: 'string',
  breadcrumbs: 'string[]',
  tags: 'enum[]',
  url: 'string',
  locale: 'enum',
  embeddings: 'vector[512]',
} as const;

const DefaultLanguage = 'multilingual';

export async function createDB({
  indexes,
  tokenizer,
  language = DefaultLanguage,
  search: _,
  localeFilter: __,
  ...rest
}: AdvancedOptions): Promise<ZBSearch<typeof advancedSchema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;
  const resolvedTokenizer = tokenizer ?? rest.components?.tokenizer;

  const db = create({
    schema: advancedSchema,
    language: resolvedTokenizer ? undefined : language,
    ...rest,
    components: {
      ...rest.components,
      tokenizer: resolvedTokenizer,
    },
  }) as ZBSearch<typeof advancedSchema>;

  const mapTo: PartialSchemaDeep<AdvancedDocument>[] = buildDocuments(items);
  await insertMultiple(db, mapTo);
  return db;
}

export async function createDBSimple({
  indexes,
  tokenizer,
  language = DefaultLanguage,
  search: _,
  localeFilter: __,
  ...rest
}: SimpleOptions): Promise<ZBSearch<typeof simpleSchema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;
  const resolvedTokenizer = tokenizer ?? rest.components?.tokenizer;

  const db = create({
    schema: simpleSchema,
    language: resolvedTokenizer ? undefined : language,
    ...rest,
    components: {
      ...rest.components,
      tokenizer: resolvedTokenizer,
    },
  }) as ZBSearch<typeof simpleSchema>;

  await insertMultiple(
    db,
    items.map((page) => ({
      title: page.title,
      description: page.description,
      breadcrumbs: page.breadcrumbs,
      url: page.url,
      content: page.content,
      keywords: page.keywords,
      locale: page.locale,
    })),
  );

  return db;
}
