import * as ts from 'ts-morph';

function simplifyType(type: ts.Type, checker: ts.TypeChecker): string {
  // Handle union types
  if (type.isUnion()) {
    const types: string[] = [];
    for (const t of type.getUnionTypes()) {
      const str = simplifyType(t, checker);
      if (str !== 'never') types.unshift(str);
    }

    return types.length > 0 ? types.join(' | ') : 'never';
  }

  // Handle intersection types
  if (type.isIntersection()) {
    const types: string[] = [];
    for (const t of type.getIntersectionTypes()) {
      types.unshift(simplifyType(t, checker));
    }

    return types.join(' & ');
  }

  if (type.isTuple()) {
    const elements = type
      .getTupleElements()
      .map((t) => simplifyType(t, checker))
      .join(', ');

    return `[${elements}]`;
  }

  const alias = type.getAliasSymbol();
  if (alias && type.getAliasTypeArguments().length === 0) {
    return alias.getEscapedName();
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

  return type.getText();
}

export function getSimpleForm(type: ts.Type, checker: ts.TypeChecker): string {
  return simplifyType(type, checker);
}
