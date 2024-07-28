import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { resolve } from '@/ui/shared';
import { type RequestSchema } from '@/render/playground';
import { type DynamicField } from '@/ui/contexts/schema';

/**
 * Create request body from value
 */
export function createBodyFromValue(
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
  dynamic: Map<string, DynamicField>,
): unknown {
  return convertValue('body', value, schema, references, dynamic);
}

/**
 * Convert a value (object or string) to the corresponding type of schema
 *
 * @param fieldName - field name of value
 * @param value - the original value
 * @param schema - the schema of field
 * @param references - schema references
 * @param dynamic - Dynamic references
 */
function convertValue(
  fieldName: string,
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
  dynamic: Map<string, DynamicField>,
): unknown {
  const isEmpty = value === '' || value === undefined || value === null;
  if (isEmpty && schema.isRequired)
    return schema.type === 'boolean' ? false : '';
  else if (isEmpty) return undefined;

  if (Array.isArray(value) && schema.type === 'array') {
    return value.map((item: unknown, index) =>
      convertValue(
        `${fieldName}.${String(index)}`,
        item,
        resolve(schema.items, references),
        references,
        dynamic,
      ),
    );
  }

  if (schema.type === 'switcher') {
    return convertDynamicValue(fieldName, value, references, dynamic);
  }

  if (typeof value === 'object' && schema.type === 'object') {
    const entries = Object.keys(value).map((key) => {
      const prop = value[key as keyof object];
      const propFieldName = `${fieldName}.${key}`;

      if (key in schema.properties) {
        return [
          key,
          convertValue(
            propFieldName,
            prop,
            resolve(schema.properties[key], references),
            references,
            dynamic,
          ),
        ];
      }

      if (schema.additionalProperties) {
        return [
          key,
          convertDynamicValue(propFieldName, prop, references, dynamic),
        ];
      }

      console.warn('Could not resolve field', propFieldName, dynamic);
      return [key, prop];
    });

    return Object.fromEntries(entries);
  }

  switch (schema.type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'null' ? undefined : value === 'true';
    default:
      return String(value);
  }
}

function convertDynamicValue(
  fieldName: string,
  value: unknown,
  references: Record<string, RequestSchema>,
  dynamic: Map<string, DynamicField>,
): unknown {
  const fieldDynamic = dynamic.get(fieldName);

  return convertValue(
    fieldName,
    value,
    fieldDynamic?.type === 'field'
      ? resolve(fieldDynamic.schema, references)
      : { type: 'null', isRequired: false },
    references,
    dynamic,
  );
}

interface StatusInfo {
  description: string;
  color: string;
  icon: React.ElementType;
}

const statusMap: Record<number, StatusInfo> = {
  400: { description: 'Bad Request', color: 'text-red-500', icon: CircleXIcon },
  401: {
    description: 'Unauthorized',
    color: 'text-red-500',
    icon: CircleXIcon,
  },
  403: { description: 'Forbidden', color: 'text-red-500', icon: CircleXIcon },
  404: {
    description: 'Not Found',
    color: 'text-fd-muted-foreground',
    icon: CircleXIcon,
  },
  500: {
    description: 'Internal Server Error',
    color: 'text-red-500',
    icon: CircleXIcon,
  },
};

export function getStatusInfo(status: number): StatusInfo {
  if (status in statusMap) {
    return statusMap[status];
  }

  if (status >= 200 && status < 300) {
    return {
      description: 'Successful',
      color: 'text-green-500',
      icon: CircleCheckIcon,
    };
  }

  if (status >= 400) {
    return { description: 'Error', color: 'text-red-500', icon: CircleXIcon };
  }

  return {
    description: 'No Description',
    color: 'text-fd-muted-foreground',
    icon: CircleXIcon,
  };
}
