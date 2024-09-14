import {
  create,
  insertMultiple,
  type Orama,
  type TypedDocument,
} from '@orama/orama';
import { type SimpleOptions } from '@/search/server';

export type SimpleDocument = TypedDocument<Orama<typeof schema>>;
export const schema = {
  url: 'string',
  title: 'string',
  description: 'string',
  content: 'string',
  keywords: 'string',
} as const;

export async function createDBSimple({
  indexes,
  language,
}: SimpleOptions): Promise<Orama<typeof schema>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;
  const db = await create({
    language,
    schema: {
      url: 'string',
      title: 'string',
      description: 'string',
      content: 'string',
      keywords: 'string',
    } as const,
  });

  await insertMultiple(
    db,
    items.map((page) => ({
      title: page.title,
      description: page.description,
      url: page.url,
      content: page.content,
      keywords: page.keywords,
    })),
  );

  return db;
}
