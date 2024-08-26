import { type AnyZodObject, type z } from 'zod';
import {
  type Collections,
  type SupportedType,
  type SupportedTypes,
} from '@/config/collections';

export type Config = Record<string, Collections>;

export type InferSchema<C extends Collections> =
  C extends Collections<infer Schema> ? Schema : never;

export type InferSchemaType<C extends Collections> = z.output<InferSchema<C>>;

export type InferCollectionsProps<C extends Collections> =
  SupportedTypes[C extends Collections<AnyZodObject, infer Type>
    ? Type
    : never];

export type CollectionEntry<C extends Collections> =
  C extends Collections<AnyZodObject, SupportedType, infer Output>
    ? Omit<Output, '_file'> & {
        _file: {
          path: string;
        };
      }
    : never;

/**
 * Get output type of collections
 */
export type GetOutput<C extends Collections> = CollectionEntry<C>[];
