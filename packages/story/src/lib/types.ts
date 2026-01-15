export type TypeNode =
  | ObjectNode
  | EnumNode
  | StringNode
  | NumberNode
  | BooleanNode
  | ArrayNode
  | UnionNode
  | IntersectionNode
  | LiteralNode
  | NullNode
  | UndefinedNode
  | UnknownNode;

export interface ObjectNode {
  type: 'object';
  properties: {
    name: string;
    type: TypeNode;
    required: boolean;
  }[];
}

export interface EnumNode {
  type: 'enum';
  members: {
    label: string;
    value: unknown;
  }[];
}

export interface StringNode {
  type: 'string';
}

export interface NumberNode {
  type: 'number';
}

export interface BooleanNode {
  type: 'boolean';
}

export interface ArrayNode {
  type: 'array';
  elementType: TypeNode;
}

export interface UnionNode {
  type: 'union';
  types: TypeNode[];
}

export interface IntersectionNode {
  type: 'intersection';
  types: TypeNode[];
}

export interface LiteralNode {
  type: 'literal';
  value: string | number | boolean;
}

export interface NullNode {
  type: 'null';
}

export interface UndefinedNode {
  type: 'undefined';
}

export interface UnknownNode {
  type: 'unknown';
  typeName: string;
}
