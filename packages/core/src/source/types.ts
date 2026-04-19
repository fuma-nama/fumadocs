import type { Meta, Page } from './loader';
import type { SourceUnion } from './source';
import type {
  ContentStorage,
  ContentStorageMetaFile,
  ContentStoragePageFile,
} from './storage/content';

export type AnyInput = SourceUnion | Record<string, SourceUnion>;

export type GeneratePage<T extends AnyInput> =
  T extends Record<infer K extends string, SourceUnion>
    ? {
        [k in K]: T[K] extends SourceUnion<infer D> ? Page<K, D['pageData']> : never;
      }[K]
    : T extends SourceUnion<infer D>
      ? Page<undefined, D['pageData']>
      : never;

export type GenerateMeta<T extends AnyInput> =
  T extends Record<infer K extends string, SourceUnion>
    ? {
        [k in K]: T[K] extends SourceUnion<infer D> ? Meta<K, D['metaData']> : never;
      }[K]
    : T extends SourceUnion<infer D>
      ? Meta<undefined, D['metaData']>
      : never;

export type GeneratePageFile<T extends AnyInput> =
  T extends Record<infer K extends string, SourceUnion>
    ? {
        [k in K]: T[K] extends SourceUnion<infer D>
          ? ContentStoragePageFile<K, D['pageData']>
          : never;
      }[K]
    : T extends SourceUnion<infer D>
      ? ContentStoragePageFile<undefined, D['pageData']>
      : never;

export type GenerateMetaFile<T extends AnyInput> =
  T extends Record<infer K extends string, SourceUnion>
    ? {
        [k in K]: T[K] extends SourceUnion<infer D>
          ? ContentStorageMetaFile<K, D['metaData']>
          : never;
      }[K]
    : T extends SourceUnion<infer D>
      ? ContentStorageMetaFile<undefined, D['metaData']>
      : never;

export type GenerateStorage<T extends AnyInput> = ContentStorage<
  GeneratePageFile<T>,
  GenerateMetaFile<T>
>;
