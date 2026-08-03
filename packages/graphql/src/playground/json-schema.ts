import {
  type GraphQLInputType,
  isEnumType,
  isListType,
  isNonNullType,
  isScalarType,
  print,
} from 'graphql';
import type { ParsedSchema } from '@fumadocs/api-docs/schema';

/**
 * Convert a GraphQL input type into JSON Schema, for the playground form.
 */
export function inputTypeToJsonSchema(type: GraphQLInputType, depth = 0): ParsedSchema {
  if (isNonNullType(type)) return inputTypeToJsonSchema(type.ofType, depth);
  if (isListType(type))
    return {
      type: 'array',
      items: inputTypeToJsonSchema(type.ofType, depth),
    };

  if (isEnumType(type)) {
    return {
      type: 'string',
      description: type.description ?? undefined,
      enum: type.getValues().map((value) => value.name),
    };
  }

  if (isScalarType(type)) {
    switch (type.name) {
      case 'ID':
      case 'String':
        return { type: 'string' };
      case 'Int':
        return { type: 'integer' };
      case 'Float':
        return { type: 'number' };
      case 'Boolean':
        return { type: 'boolean' };
      default:
        // custom scalars accept arbitrary values
        return {
          type: ['string', 'number', 'boolean'],
          description: type.description ?? undefined,
        };
    }
  }

  // input object, guard against cyclic references
  if (depth >= 8) {
    return { type: 'object', additionalProperties: true };
  }

  const properties: Record<string, ParsedSchema> = {};
  const required: string[] = [];

  for (const field of Object.values(type.getFields())) {
    const schema = inputTypeToJsonSchema(field.type, depth + 1);

    properties[field.name] = {
      ...(typeof schema === 'object' ? schema : {}),
      description:
        field.description ?? (typeof schema === 'object' ? schema.description : undefined),
      default:
        field.default !== undefined
          ? field.default.literal
            ? print(field.default.literal)
            : field.default.value
          : undefined,
    };

    if (isNonNullType(field.type) && field.default === undefined) {
      required.push(field.name);
    }
  }

  return {
    type: 'object',
    description: type.description ?? undefined,
    properties,
    required,
    additionalProperties: false,
  };
}
