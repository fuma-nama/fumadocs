import {
  coerceInputLiteral,
  type GraphQLInputField,
  type GraphQLInputObjectType,
  type GraphQLInputType,
  isEnumType,
  isListType,
  isNonNullType,
  isRequiredInputField,
  isScalarType,
} from 'graphql';
import type { JsonSchema } from '@fumadocs/json-schema';

type Schema = Exclude<JsonSchema, boolean>;

/** the schemas of input objects in a conversion, recursive inputs reference their own schema */
type ObjectSchemas = Map<GraphQLInputObjectType, Schema>;

/**
 * Convert a GraphQL input type into JSON Schema, for the playground form.
 *
 * Input objects are converted once, the schema of a recursive input is a cyclic object graph.
 */
export function inputTypeToJsonSchema(type: GraphQLInputType): Schema {
  return typeToSchema(type, new Map());
}

function typeToSchema(type: GraphQLInputType, objectSchemas: ObjectSchemas): Schema {
  if (isNonNullType(type)) return typeToSchema(type.ofType, objectSchemas);
  if (isListType(type))
    return {
      type: 'array',
      items: typeToSchema(type.ofType, objectSchemas),
    };

  if (isEnumType(type)) {
    return {
      type: 'string',
      title: type.name,
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

  let schema = objectSchemas.get(type);
  if (schema) return schema;

  const fields = Object.values(type.getFields());
  const base = { title: type.name, description: type.description ?? undefined };
  // cached before its fields are converted, so they can reference it
  if (type.isOneOf) {
    // a `@oneOf` input object takes exactly one of its fields
    const oneOf: Schema[] = [];
    objectSchemas.set(type, (schema = { ...base, oneOf }));
    for (const field of fields) {
      oneOf.push({
        // the label of member in selects
        title: field.name,
        type: 'object',
        properties: { [field.name]: fieldToSchema(field, objectSchemas) },
        required: [field.name],
        additionalProperties: false,
      });
    }

    return schema;
  }

  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  objectSchemas.set(
    type,
    (schema = { ...base, type: 'object', properties, required, additionalProperties: false }),
  );
  for (const field of fields) {
    properties[field.name] = fieldToSchema(field, objectSchemas);
    if (isRequiredInputField(field)) required.push(field.name);
  }

  return schema;
}

function fieldToSchema(field: GraphQLInputField, objectSchemas: ObjectSchemas): Schema {
  const schema = typeToSchema(field.type, objectSchemas);
  const defaultInput = field.default;
  if (!field.description && !defaultInput) return schema;

  return {
    ...schema,
    description: field.description ?? schema.description,
    default: defaultInput?.literal
      ? coerceInputLiteral(defaultInput.literal, field.type)
      : defaultInput?.value,
  };
}
