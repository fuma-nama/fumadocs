import { Node, Type, TypeChecker, TypeFormatFlags } from 'ts-morph';

interface TypeSimplifierContext {
  type: Type;
  checker: TypeChecker;
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
  ctx: TypeSimplifierContext,
  options: TypeSimplifierOptions = {},
): string {
  const { type } = ctx;
  const { override, shouldSimplify, noUndefined = false } = options;

  if (type.isUndefined() && noUndefined) return '';

  const overridden = override?.(ctx);
  if (overridden) return overridden;

  if (shouldSimplify && !shouldSimplify(ctx)) {
    return type.getText(ctx.location, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  }

  const alias = type.getAliasSymbol();
  if (alias) {
    const args = type.getAliasTypeArguments();
    if (args.length === 0) return alias.getName();

    const nextOptions = { ...options, noUndefined: false };
    return `${alias.getName()}<${args.map((arg) => getSimpleForm({ ...ctx, type: arg }, nextOptions)).join(', ')}>`;
  }

  if (type.isUnion()) return 'union';

  if (type.isIntersection()) {
    const types: string[] = [];
    for (const t of type.getIntersectionTypes()) {
      const str = getSimpleForm({ ...ctx, type: t }, options);
      if (str.length > 0 && str !== 'never') types.unshift(str);
    }

    return dedupe(types).join(' & ');
  }

  if (type.isTuple()) {
    return 'tuple';
  }

  if (type.isArray() || type.isReadonlyArray()) {
    return 'array';
  }

  if (type.getCallSignatures().length > 0) {
    return 'function';
  }

  if (type.isClassOrInterface() || type.isObject()) {
    return 'object';
  }

  return type.getText(ctx.location, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
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
