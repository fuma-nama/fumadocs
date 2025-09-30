import * as ts from 'ts-morph';

export function getSimpleForm(
  type: ts.Type,
  checker: ts.TypeChecker,
  noUndefined = false,
  location?: ts.Node,
): string {
  if (type.isUndefined() && noUndefined) return '';

  const alias = type.getAliasSymbol();
  if (alias) {
    const args = type.getAliasTypeArguments();
    if (args.length === 0) return alias.getName();

    return `${alias.getName()}<${args.map((arg) => getSimpleForm(arg, checker)).join(', ')}>`;
  }

  if (type.isUnion()) {
    const types: string[] = [];
    for (const t of type.getUnionTypes()) {
      const str = getSimpleForm(t, checker, noUndefined);
      if (str.length > 0 && str !== 'never') types.unshift(str);
    }

    return types.length > 0
      ? // boolean | null will become true | false | null, need to ensure it's still returned as boolean
        dedupe(types).join(' | ').replace('true | false', 'boolean')
      : 'never';
  }

  if (type.isIntersection()) {
    const types: string[] = [];
    for (const t of type.getIntersectionTypes()) {
      const str = getSimpleForm(t, checker, noUndefined);
      if (str.length > 0 && str !== 'never') types.unshift(str);
    }

    return dedupe(types).join(' & ');
  }

  if (type.isTuple()) {
    const elements = type
      .getTupleElements()
      .map((t) => getSimpleForm(t, checker))
      .join(', ');

    return `[${elements}]`;
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

  return type.getText(
    location,
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );
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
