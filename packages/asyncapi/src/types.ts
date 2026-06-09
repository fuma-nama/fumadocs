export type {
  AsyncAPIObject,
  ChannelObject,
  MessageObject,
  MessageExampleObject,
  OperationObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
  ReferenceObject,
  ParameterObject,
  AsyncAPISchemaObject,
  MultiFormatSchemaObject,
  OperationReplyObject,
  KafkaChannelBinding,
  KafkaOperationBinding,
  KafkaMessageBinding,
  KafkaServerBinding,
} from './types/asyncapi-3';
import type { DereferencedDocument } from '@/utils/document/dereference';
import type { AsyncAPIOptions } from '@/server';
import type { CreateAsyncAPIPageOptions } from './ui';
import type { FC, ReactNode } from 'react';
import type { SchemaUIOptions } from '@fumadocs/api-docs/components/schema';

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export interface RenderContext
  extends
    Pick<AsyncAPIOptions, 'proxyUrl'>,
    Omit<
      RequireKeys<
        CreateAsyncAPIPageOptions,
        'generateTypeScriptDefinitions' | 'shikiOptions' | 'shiki'
      >,
      'schemaUI'
    > {
  schema: DereferencedDocument;
  _default_processMarkdown: (md: string) => ReactNode;
  SchemaUI: FC<Omit<SchemaUIOptions, 'resolver' | 'renderMarkdown'>>;
}

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | Promise<T>;
