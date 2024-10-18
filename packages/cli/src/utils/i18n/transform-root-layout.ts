import fs from 'node:fs/promises';
import { type Project, type SourceFile, StructureKind, ts } from 'ts-morph';
import ScriptKind = ts.ScriptKind;
import SyntaxKind = ts.SyntaxKind;

export async function transformRootLayout(
  project: Project,
  filePath: string,
): Promise<void> {
  let content: string;

  try {
    content = await fs.readFile(filePath).then((res) => res.toString());
  } catch {
    return;
  }

  const sourceFile = project.createSourceFile(filePath, content, {
    overwrite: true,
    scriptKind: ScriptKind.TSX,
  });

  runTransform(sourceFile);

  return sourceFile.save();
}

export function runTransform(sourceFile: SourceFile): void {
  const rootProvider = sourceFile
    .getDescendantsOfKind(SyntaxKind.JsxElement)
    .find(
      (node) =>
        node.getOpeningElement().getTagNameNode().getFullText() ===
        'RootProvider',
    );

  if (!rootProvider) return;

  const parent = rootProvider.getParentIfKind(SyntaxKind.JsxElement);

  if (parent) {
    const inner = parent
      .getJsxChildren()
      .map((v) => v.getFullText())
      .filter((v) => v.length > 0)
      .join('\n');

    parent.setBodyText(
      `<I18nProvider locale={params.lang} locales={[
    { locale: 'en', name: 'English' }
]}>
  ${inner.trim()}
</I18nProvider>`,
    );

    sourceFile.addImportDeclaration({
      kind: StructureKind.ImportDeclaration,
      moduleSpecifier: 'fumadocs-ui/i18n',
      namedImports: ['I18nProvider'],
    });
  }

  // add types for `params`
  const func = sourceFile
    .getDescendantsOfKind(SyntaxKind.FunctionDeclaration)
    .find((v) => v.isDefaultExport());
  const param = func?.getParameters().at(0);
  param?.setType(`{ params: { lang: string }, children: ReactNode }`);
  param?.set({
    name: `{ params, children }`,
  });
}
