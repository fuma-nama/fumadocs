import { SourceFile, StructureKind, SyntaxKind } from 'ts-morph';

/**
 * 1. find the `<RootProvider />` call.
 * 2. add `search={{ SearchDialog }}` prop.
 * 3. add import of `SearchDialog`.
 *
 */
export function addSearchDialog(sourceFile: SourceFile) {
  const elements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);

  for (const element of elements) {
    const provider = element.getFirstChildByKind(SyntaxKind.JsxOpeningElement);
    if (provider?.getTagNameNode().getText() !== 'RootProvider') continue;

    // Skip if search prop already exists
    if (
      provider
        .getAttributes()
        .some(
          (attr) =>
            attr.isKind(SyntaxKind.JsxAttribute) &&
            attr.getNameNode().getText() === 'search',
        )
    )
      continue;

    provider.addAttribute({
      kind: StructureKind.JsxAttribute,
      name: 'search',
      initializer: '{{ SearchDialog }}',
    });
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@/components/search',
    defaultImport: 'SearchDialog',
  });
}
