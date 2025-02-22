import type { PrimitiveRequestField, RequestSchema } from '@/playground/index';
import { resolve } from '@/playground/resolve';

export function getDefaultValue(
  item: RequestSchema,
  references: Record<string, RequestSchema>,
): unknown {
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

  return String(item.defaultValue);
}

export function getDefaultValues(
  field: PrimitiveRequestField[],
  context: Record<string, RequestSchema>,
): Record<string, unknown> {
  return Object.fromEntries(
    field.map((p) => [p.name, getDefaultValue(p, context)]),
  );
}
