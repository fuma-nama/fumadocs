import { MethodDeclaration, SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Add items to `excluded` in the prerender function
 */
export function removeReactRouterPrerender(
  sourceFile: SourceFile,
  paths: string[],
) {
  const methodBody = getPrerenderMethod(sourceFile)?.getBody();
  if (!methodBody) return;

  const excludedInitializer = methodBody
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((item) => item.getName() === 'excluded')
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

  if (!excludedInitializer) return;
  for (const path of paths) {
    excludedInitializer.addElement(JSON.stringify(path));
  }
}

/**
 * Add a new route to route config
 */
export function addReactRouterRoute(
  sourceFile: SourceFile,
  routes: { path: string; entry: string }[],
) {
  const initializer = sourceFile
    .getDefaultExportSymbol()
    ?.getValueDeclaration()
    ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
  if (!initializer) {
    return;
  }

  for (const { path, entry } of routes) {
    initializer.addElement(`route('${path}', '${entry}')`);
  }
}

/**
 * Find the prerender method from the config
 */
function getPrerenderMethod(sourceFile: SourceFile): MethodDeclaration | null {
  return (
    sourceFile
      .getDefaultExportSymbol()
      ?.getValueDeclaration()
      ?.asKind(SyntaxKind.VariableDeclaration)
      ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperty('prerender')
      ?.asKind(SyntaxKind.MethodDeclaration) ?? null
  );
}
