import type { FC } from 'react';
import type { CreateGraphQLPageOptions } from './ui';
import type { SchemaViewProps } from './utils/create-page';

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * the options of `createGraphQLPage()`, passed to its render functions.
 *
 * the page's schema and other runtime values are available from `useGraphQL()`.
 */
export interface RenderContext extends Omit<
  RequireKeys<CreateGraphQLPageOptions, 'shikiOptions' | 'shiki'>,
  'schemaUI'
> {
  /**
   * the default Schema UI, or the one passed to `components.SchemaUI`.
   */
  SchemaUI: FC<SchemaViewProps>;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
