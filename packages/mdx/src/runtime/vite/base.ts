import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DocMap, LazyDocMap, MetaMap } from '@/runtime/vite/types';

export interface BaseCreate<Config> {
  doc: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? DocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  docLazy: <Name extends keyof Config>(
    name: Name,
    base: string,
    headGlob: Record<string, () => Promise<unknown>>,
    bodyGlob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? LazyDocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  meta: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | MetaCollection<infer Schema>
    | DocsCollection<StandardSchemaV1, infer Schema>
    ? MetaMap<StandardSchemaV1.InferOutput<Schema>>
    : never;
}

export function fromConfigBase<Config>(): BaseCreate<Config> {
  function normalize<T>(entries: Record<string, T>, base?: string) {
    const out: Record<string, T> = {};

    for (const k in entries) {
      const mappedK = k.startsWith('./') ? k.slice(2) : k;

      if (base) Object.assign(entries[k] as object, { base });
      out[mappedK] = entries[k];
    }

    return out;
  }

  return {
    doc(_, base, glob) {
      return normalize(glob, base) as any;
    },
    meta(_, base, glob) {
      return normalize(glob, base) as any;
    },
    docLazy(_, base, head, body) {
      return {
        base,
        head: normalize(head),
        body: normalize(body),
      } as any;
    },
  };
}
