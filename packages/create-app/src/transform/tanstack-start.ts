import { CallExpression, SourceFile, SyntaxKind } from 'ts-morph';
import { getCodeValue } from '@/transform/shared';

/**
 * Add path to the `pages` array in tanstack start vite config.
 *
 * If the `pages` property doesn't exist, create one.
 */
export function addTanstackPrerender(sourceFile: SourceFile, paths: string[]) {
  const optionsArg = getTanstackStartCall(sourceFile)
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression);
  if (!optionsArg) {
    return;
  }

  const pagesProperty = optionsArg
    .getProperty('pages')
    ?.asKind(SyntaxKind.PropertyAssignment);

  function toItem(path: string) {
    return `{ path: '${path}' }`;
  }

  if (pagesProperty) {
    const initializer = pagesProperty.getInitializerIfKindOrThrow(
      SyntaxKind.ArrayLiteralExpression,
    );

    const existingPaths = new Set<string>();
    for (const element of initializer.getElements()) {
      const value = element
        .asKind(SyntaxKind.ObjectLiteralExpression)
        ?.getProperty('path')
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializer()
        ?.getText();

      if (value) {
        existingPaths.add(getCodeValue(value));
      }
    }

    for (const path of paths) {
      if (existingPaths.has(path)) continue;
      initializer.addElement(toItem(path));
    }
  } else {
    optionsArg.addProperty(
      `pages: [\n${paths.map((path) => `  ${toItem(path)}`).join(',\n')}\n]`,
    );
  }
}

/**
 * Find the tanstackStart call expression
 */
function getTanstackStartCall(
  sourceFile: SourceFile,
): CallExpression | undefined {
  const pluginsProperty = sourceFile
    .getDefaultExportSymbol()
    ?.getValueDeclaration()
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
    ?.getProperty('plugins')
    ?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);

  if (!pluginsProperty) return;

  for (const element of pluginsProperty.getElements()) {
    const expression = element.asKind(SyntaxKind.CallExpression);
    if (
      expression?.getFirstChildByKind(SyntaxKind.Identifier)?.getText() ===
      'tanstackStart'
    ) {
      return expression;
    }
  }
}
