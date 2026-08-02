import fs from 'node:fs/promises';
import {
  buildClientSchema,
  GraphQLSchema,
  type IntrospectionQuery,
  printSchema,
} from 'graphql';
import { buildSchemaFromSDL } from '@/utils/build-schema';

export type GraphQLSchemaInput =
  | string
  | string[]
  | GraphQLSchema
  | IntrospectionQuery
  | { data: IntrospectionQuery };

export interface LoadedSchema {
  schema: GraphQLSchema;
  /**
   * the SDL representation of schema, used to transfer the schema to client components.
   */
  sdl: string;
}

export function isFilePath(input: string): boolean {
  return !input.includes('\n') && /\.(graphqls?|gql)$/i.test(input) && !/^https?:\/\//.test(input);
}

async function readSDL(input: string): Promise<string> {
  if (/^https?:\/\//.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`failed to fetch ${input}: HTTP ${res.status}`);
    return await res.text();
  }

  return await fs.readFile(input, 'utf8');
}

/**
 * Process input to a Fumadocs GraphQL compatible format, input can be:
 *
 * - a file path/URL to SDL file (or an array of them, merged into a single schema).
 * - SDL text.
 * - an introspection result (`IntrospectionQuery`).
 * - a `GraphQLSchema` instance.
 */
export async function loadSchema(input: GraphQLSchemaInput): Promise<LoadedSchema> {
  try {
    if (input instanceof GraphQLSchema) {
      return { schema: input, sdl: printSchema(input) };
    }

    if (Array.isArray(input) || typeof input === 'string') {
      const parts = Array.isArray(input) ? input : [input];
      const sources = await Promise.all(
        parts.map((part) =>
          isFilePath(part) || /^https?:\/\//.test(part) ? readSDL(part) : part,
        ),
      );
      const sdl = sources.join('\n\n');

      return { schema: buildSchemaFromSDL(sdl), sdl };
    }

    const introspection = 'data' in input ? input.data : input;
    const schema = buildClientSchema(introspection);
    return { schema, sdl: printSchema(schema) };
  } catch (e) {
    throw new Error(
      `[Fumadocs GraphQL] Failed to load schema: ${Array.isArray(input) || typeof input === 'string' ? input : 'introspection result'}`,
      {
        cause: e,
      },
    );
  }
}
