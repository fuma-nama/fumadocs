import type { ReferenceSchema, RequestSchema } from '@/playground/index';
import { resolve } from '@/playground/resolve';

export function getDefaultValue(
  item: RequestSchema | ReferenceSchema,
  references: Record<string, RequestSchema>,
): unknown {
  if (item.type === 'ref')
    return getDefaultValue(resolve(item, references), references);
  if (item.type === 'object')
    return Object.fromEntries(
      Object.entries(item.properties).map(([key, prop]) => [
        key,
        getDefaultValue(
          prop.type === 'ref' ? references[prop.schema] : prop,
          references,
        ),
      ]),
    );

  if (item.type === 'array') return [];
  if (item.type === 'null') return null;
  if (item.type === 'switcher') {
    const first = Object.values(item.items).at(0);
    if (!first) return '';

    return getDefaultValue(resolve(first, references), references);
  }

  if (item.type === 'file') return undefined;
  if (item.type === 'string') return '';
  if (item.type === 'number') return 0;
  if (item.type === 'boolean') return false;
}
