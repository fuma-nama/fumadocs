import type * as GraphQL from '@fumadocs/graphql';
import type * as Operation from '@fumadocs/graphql/operation';
import type * as PlaygroundModule from '@fumadocs/graphql/playground';
import type * as TypeDocs from '@fumadocs/graphql/type-docs';
import type * as UI from '@fumadocs/graphql/ui';

export type OperationInfo = Operation.OperationInfo;
export type OperationExample = GraphQL.OperationExample;

export type NamedTypeInfo = TypeDocs.NamedTypeInfo;
export type TypeUsages = TypeDocs.TypeUsages;

export type CodeUsageData = UI.CodeUsageData;
export type SubscriptionHandlers = PlaygroundModule.SubscriptionHandlers;
