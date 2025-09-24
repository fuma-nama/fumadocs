import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';

export type CompiledMDXFile<Frontmatter> = CompiledMDXProperties<Frontmatter> &
  Record<string, unknown>;

export type DocMap<Frontmatter> = Record<
  string,
  (() => Promise<CompiledMDXFile<Frontmatter>>) & { base: string }
>;

export type MetaMap<Data> = Record<
  string,
  (() => Promise<Data>) & { base: string }
>;

export interface LazyDocMap<Frontmatter> {
  base: string;
  head: Record<string, () => Promise<Frontmatter>>;
  body: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>;
}
