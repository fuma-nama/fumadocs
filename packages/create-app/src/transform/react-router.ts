import { Program, Visitor } from 'oxc-parser';

/**
 * filter items in a specific array initializer in the prerender function
 */
export function filterReactRouterPrerenderArray(
  routesAst: Program,
  array: 'paths' | 'excluded',
  filter: (item: string) => boolean,
) {
  const methodBody = getPrerenderMethod(sourceFile)?.getBody();
  if (!methodBody) return;
  new Visitor({
    VariableDeclaration(node) {
      const d = node.declarations.find((d) => d.id.type === 'Identifier' && d.id.name === array);

      if (!d?.init || d.init.type !== 'ArrayExpression') return;

      d.init.elements = d.init.elements.filter((element) => {
        if (!element || element.type !== 'Literal') return true;
        return filter(element.value as string);
      });
    },
  }).visit(routesAst);
}

/**
 * Add a new route to route config
 */
export function addReactRouterRoute(
  sourceFile: SourceFile,
  routes: { path: string; entry: string }[],
) {
  modifyReactRouterRoutes(sourceFile, (arr) => {
    for (const { path, entry } of routes) {
      arr.addElement(`route('${path}', '${entry}')`);
    }
  });
}

/**
 * Remove routes from route config (root level only)
 */
export function filterReactRouterRoute(
  sourceFile: SourceFile,
  filter: (item: { path: string; entry: string }) => boolean,
) {
  modifyReactRouterRoutes(sourceFile, (arr) => {
    for (const element of arr.getElements()) {
      if (
        !element.isKind(SyntaxKind.CallExpression) ||
        element.getFirstChildByKind(SyntaxKind.Identifier)?.getText() !== 'route'
      )
        continue;
      const args = element.getArguments();

      if (
        filter({
          path: getCodeValue(args[0].getText()),
          entry: getCodeValue(args[1].getText()),
        })
      )
        continue;

      arr.removeElement(element);
    }
  });
}

export function modifyReactRouterRoutes(
  sourceFile: SourceFile,
  mod: (array: ArrayLiteralExpression) => void,
) {
  const initializer = sourceFile
    .getDefaultExportSymbol()
    ?.getValueDeclaration()
    ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
  if (initializer) mod(initializer);
}

/**
 * Find the prerender method from the config
 */
function getPrerenderMethod(sourceFile: SourceFile): MethodDeclaration | null {
  return (
    sourceFile
      .getDefaultExportSymbol()
      ?.getValueDeclaration()
      ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperty('prerender')
      ?.asKind(SyntaxKind.MethodDeclaration) ?? null
  );
}
