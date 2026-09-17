import type { CreateAsyncAPIPageOptions } from './ui';
import type { FC } from 'react';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * the options of `createAsyncAPIPage()`, passed to its render functions.
 *
 * the page's document and other runtime values are available from `useAsyncAPI()`.
 */
export interface RenderContext extends Omit<
  RequireKeys<CreateAsyncAPIPageOptions, 'shikiOptions' | 'shiki'>,
  'schemaUI'
> {
  /** the default Schema UI, or the one passed to `components.SchemaUI` */
  SchemaUI: FC<Omit<SchemaUIOptions, 'resolver' | 'renderMarkdown' | 'renderCodeblock'>>;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
export type * from './types/asyncapi-3';
