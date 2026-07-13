import type { JSONSchema } from 'json-schema-typed/draft-2020-12';

type ReferenceObject = { $ref: string };

export type NoReference<T> = T extends (infer I)[]
  ? NoReference<I>[]
  : T extends ReferenceObject
    ? Exclude<T, ReferenceObject>
    : T extends object
      ? {
          [K in keyof T]: NoReference<T[K]>;
        }
      : T;

export type NoReferenceSwallow<T> = T extends ReferenceObject ? Exclude<T, ReferenceObject> : T;

export type ParsedSchema =
  | (JSONSchema & {
      'x-playground-lazy'?: boolean;
      discriminator?: {
        propertyName?: string;
        mapping?: Record<string, string>;
      };
    })
  | boolean;
