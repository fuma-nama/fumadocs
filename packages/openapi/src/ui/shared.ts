import { cva, type VariantProps } from 'class-variance-authority';
import {
  type PrimitiveRequestField,
  type ReferenceSchema,
  type RequestSchema,
} from '@/render/playground';

export const badgeVariants = cva(
  'rounded border px-1.5 py-1 text-xs font-medium leading-[12px]',
  {
    variants: {
      color: {
        green:
          'border-green-400/50 bg-green-400/20 text-green-600 dark:text-green-400',
        yellow:
          'border-yellow-400/50 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
        red: 'border-red-400/50 bg-red-400/20 text-red-600 dark:text-red-400',
        blue: 'border-blue-400/50 bg-blue-400/20 text-blue-600 dark:text-blue-400',
        orange:
          'border-orange-400/50 bg-orange-400/20 text-orange-600 dark:text-orange-400',
      },
    },
  },
);

export function getBadgeColor(
  method: string,
): VariantProps<typeof badgeVariants>['color'] {
  switch (method) {
    case 'PUT':
      return 'yellow';
    case 'PATCH':
      return 'orange';
    case 'POST':
      return 'blue';
    case 'DELETE':
      return 'red';
    default:
      return 'green';
  }
}

export type References = Record<string, RequestSchema>;

export function getDefaultValue(
  item: RequestSchema,
  references: References,
): unknown {
  if (item.type === 'object')
    return Object.fromEntries(
      Object.entries(item.properties).map(([key, prop]) => [
        key,
        getDefaultValue(references[prop.schema], references),
      ]),
    );

  if (item.type === 'array') return [];
  if (item.type === 'null') return null;
  if (item.type === 'switcher')
    return getDefaultValue(
      resolve(Object.values(item.items)[0], references),
      references,
    );

  return String(item.defaultValue);
}

export function getDefaultValues(
  field: PrimitiveRequestField[],
  context: References,
): Record<string, unknown> {
  return Object.fromEntries(
    field.map((p) => [p.name, getDefaultValue(p, context)]),
  );
}

/**
 * Resolve reference
 */
export function resolve(
  schema: RequestSchema | ReferenceSchema | string,
  references: References,
): RequestSchema {
  if (typeof schema === 'string') return references[schema];
  if (schema.type !== 'ref') return schema;

  return {
    ...references[schema.schema],
    description: schema.description,
    isRequired: schema.isRequired,
  };
}
