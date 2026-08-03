import type { GraphQLSchema } from 'graphql';
import type { FC, ReactNode } from 'react';
import type { CreateGraphQLPageOptions, GraphQLLinks } from './ui';
import type { SchemaViewProps } from './ui/schema-ui';

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export interface RenderContext extends Omit<
  RequireKeys<CreateGraphQLPageOptions, 'shikiOptions' | 'shiki'>,
  'schemaUI'
> {
  schema: {
    schema: GraphQLSchema;
    sdl: string;
    /**
     * pre-generated links of generated pages, see `GraphQLPageProps['payload']['links']`.
     */
    links?: GraphQLLinks;
  };
  _default_processMarkdown: (md: string) => ReactNode;
  SchemaUI: FC<SchemaViewProps>;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
