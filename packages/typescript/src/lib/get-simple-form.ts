import {
  type Checker,
  isIntersectionType,
  isObjectType,
  isUnionType,
  NodeBuilderFlags,
  SignatureKind,
  type Type,
  TypeFlags,
} from 'typescript/unstable/sync';
import type { Node } from 'typescript/unstable/ast';

interface TypeSimplifierContext {
  type: Type;
  checker: Checker;
  location?: Node;
}

export interface TypeSimplifierOptions {
  /**
   * whether the simplified names should be preferred over the type names.
   *
   * Default: always prefer simplified ones.
   */
  shouldSimplify?: (ctx: TypeSimplifierContext) => boolean;
  override?: (ctx: TypeSimplifierContext) => string | undefined;
  noUndefined?: boolean;
}

export function getSimpleForm(
  type: Type,
  checker: Checker,
  location?: Node,
  options: TypeSimplifierOptions = {},
): string {
  const { override, shouldSimplify, noUndefined = false } = options;

  if ((type.flags & TypeFlags.Undefined) !== 0 && noUndefined) return '';

  const overridden = override?.({ checker, type, location });
  if (overridden) return overridden;

  if (shouldSimplify && !shouldSimplify({ checker, type, location })) {
    return checker.typeToString(
      type,
      location,
      NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope,
    );
  }

  const alias = type.getAliasSymbol();
  if (alias) {
    const args = type.getAliasTypeArguments();
    if (args.length === 0) return alias.name;

    const nextOptions = { ...options, noUndefined: false };
    return `${alias.name}<${args.map((arg) => getSimpleForm(arg, checker, location, nextOptions)).join(', ')}>`;
  }

  if (isUnionType(type)) {
    if (noUndefined) {
      const members = type.getTypes().filter((t) => (t.flags & TypeFlags.Undefined) === 0);
      if (members.length === 0) return 'undefined';
      if (members.length === 1) return getSimpleForm(members[0], checker, location, options);
    }

    return 'union';
  }

  if (isIntersectionType(type)) {
    const types: string[] = [];
    for (const t of type.getTypes()) {
      const str = getSimpleForm(t, checker, location, options);
      if (str.length > 0 && str !== 'never') types.unshift(str);
    }

    return dedupe(types).join(' & ');
  }

  // only object types can be tuples, arrays, functions or objects, skip the requests for others.
  if (isObjectType(type)) {
    if (checker.isTupleType(type)) return 'tuple';
    if (checker.isArrayType(type)) return 'array';
    if (checker.getSignaturesOfType(type, SignatureKind.Call).length > 0) return 'function';

    return 'object';
  }

  if (
    (type.flags & (TypeFlags.Primitive | TypeFlags.AnyOrUnknown | TypeFlags.Never)) === 0 &&
    checker.getSignaturesOfType(type, SignatureKind.Call).length > 0
  ) {
    return 'function';
  }

  return checker.typeToString(type, location, NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope);
}

function dedupe<T>(arr: T[]): T[] {
  const dedupe = new Set<T>();
  const out: T[] = [];

  for (const item of arr) {
    if (!dedupe.has(item)) {
      out.push(item);
      dedupe.add(item);
    }
  }

  return out;
}
