import type { LoaderOutput, Meta, Page } from './loader';

export interface SubfolderMeta {
  title?: string | undefined;
  icon?: string | undefined; 
  pages?: (string | SubfolderMeta)[] | undefined;
  defaultOpen?: boolean | undefined;
  description?: string | undefined;
}

export interface MetaData {
  icon?: string | undefined;
  title?: string | undefined;
  root?: boolean | undefined;
  pages?: (string | SubfolderMeta)[] | undefined;
  defaultOpen?: boolean | undefined;

  description?: string | undefined;
}

export interface PageData {
  icon?: string | undefined;
  title?: string;
  description?: string | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferPageType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config>
    ? Page<Config['source']['pageData']>
    : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- infer types
export type InferMetaType<Utils extends LoaderOutput<any>> =
  Utils extends LoaderOutput<infer Config>
    ? Meta<Config['source']['metaData']>
    : never;

/**
 * @internal
 */
export type UrlFn = (slugs: string[], locale?: string) => string;
