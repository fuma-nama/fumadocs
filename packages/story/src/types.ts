import { ComponentPropsWithoutRef } from 'react';
import { StoryResult } from '.';

export type TypeNode =
  | ObjectNode
  | EnumNode
  | StringNode
  | BigIntNode
  | NumberNode
  | BooleanNode
  | ArrayNode
  | UnionNode
  | IntersectionNode
  | LiteralNode
  | NullNode
  | UndefinedNode
  | UnknownNode
  | NeverNode;

interface Node {
  displayName?: string;
}

export interface ObjectNode extends Node {
  type: 'object';
  properties: {
    name: string;
    type: TypeNode;
    required: boolean;
  }[];
}

export interface EnumNode extends Node {
  type: 'enum';
  members: {
    label: string;
    value: unknown;
  }[];
}

export interface BigIntNode extends Node {
  type: 'bigint';
}

export interface StringNode extends Node {
  type: 'string';
}

export interface NumberNode extends Node {
  type: 'number';
}

export interface BooleanNode extends Node {
  type: 'boolean';
}

export interface ArrayNode extends Node {
  type: 'array';
  elementType: TypeNode;
}

export interface UnionNode extends Node {
  type: 'union';
  types: TypeNode[];
}

export interface IntersectionNode extends Node {
  type: 'intersection';
  members: TypeNode[];
  intersection: TypeNode;
}

export interface LiteralNode extends Node {
  type: 'literal';
  value: string | number | boolean | bigint;
}

export interface NullNode extends Node {
  type: 'null';
}

export interface UndefinedNode extends Node {
  type: 'undefined';
}

export interface UnknownNode extends Node {
  type: 'unknown';
}

/** used for unsupported types too */
export interface NeverNode extends Node {
  type: 'never';
}

export type GetProps<Result> =
  Result extends StoryResult<infer C> ? Omit<ComponentPropsWithoutRef<C>, 'key'> : never;
