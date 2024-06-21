import type { ZodError, z } from 'zod';
import type { getTree } from './get-tree';

type FilterArray<T, U> = T extends U ? T : never;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & NonNullable<unknown>;
export type RequiredFields<T> = {
  [K in keyof T as NonNullable<unknown> extends Pick<T, K> ? never : K]: T[K];
};
export type Awaitable<T> = T | Promise<T>;
export type GitTreeItem<T extends 'blob' | 'tree' = 'blob' | 'tree'> =
  FilterArray<Awaited<ReturnType<typeof getTree>>['tree'][number], { type: T }>;

export type GetFileContent<T = { path: string; sha: string }> = <U extends T>(
  file: U,
) => Awaitable<string>;

export type JSONValue =
  | string
  | number
  | boolean
  | JSONValue[]
  | {
      [k: string]: JSONValue;
    };

export const blobToUtf8 = (blob: {
  content: string;
  encoding: BufferEncoding;
}): string => {
  return Buffer.from(blob.content, blob.encoding).toString('utf8');
};

export const fnv1a = (str: string): string => {
  const FNV_PRIME = 16777619;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * FNV_PRIME) % 2 ** 32;
    hash = (hash + str.charCodeAt(i)) % 2 ** 32;
  }

  return hash.toString(16);
};

class DataError extends Error {
  constructor(name: string, error: ZodError) {
    const info = error.flatten();

    super(
      `${name}: ${JSON.stringify(
        {
          root: info.formErrors,
          ...info.fieldErrors,
        },
        null,
        2,
      )}`,
    );
    this.name = 'DataError';
  }
}

export function parse<T extends z.ZodType<unknown>>(
  schema: T,
  object: unknown,
  errorName: string,
): z.infer<T> {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new DataError(errorName, result.error);
  }

  return result.data;
}

export const isSerializable = (value: unknown): value is JSONValue => {
  if (value === null) return true;

  if (typeof value === 'object') {
    return Object.values(value).every(isSerializable);
  }

  if (Array.isArray(value)) value.every(isSerializable);

  return ['string', 'number', 'bigint', 'boolean'].includes(typeof value);
};
