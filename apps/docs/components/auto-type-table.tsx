/* eslint-disable @typescript-eslint/no-non-null-assertion -- f */
import * as ts from 'typescript';
import { TypeTable } from 'fumadocs-ui/components/type-table';

interface DocEntry {
  name: string;
  description: string;
  type: string;
  default?: string;
}

const shortcuts: Record<string, string> = {
  ui: './content/docs/ui/props.ts',
  headless: './content/docs/headless/props.ts',
};

const configFile = ts.readJsonConfigFile('./tsconfig.json', (path) =>
  ts.sys.readFile(path),
);

const { fileNames, options } = ts.parseJsonSourceFileConfigFileContent(
  configFile,
  ts.sys,
  './',
);

const project = ts.createProgram({
  rootNames: fileNames,
  options,
});

/** Generate documentation for properties in a specific interface
 * @param name - interface name
 */
function generateDocumentation(file: string, name: string): DocEntry[] {
  const sourceFile = project.getSourceFile(file);
  if (!sourceFile) return [];

  let aliasNode: ts.TypeAliasDeclaration | undefined;

  function visit(node: ts.Node): void {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) {
      aliasNode = node;
    }
  }

  ts.forEachChild(sourceFile, visit);

  if (!aliasNode) return [];

  const aliasSymbol = project
    .getTypeChecker()
    .getSymbolAtLocation(aliasNode.name);
  if (!aliasSymbol) return [];

  const type = project.getTypeChecker().getDeclaredTypeOfSymbol(aliasSymbol);

  return type.getProperties().map<DocEntry>((p) => {
    const subType = project
      .getTypeChecker()
      .getTypeOfSymbolAtLocation(p, aliasNode!);

    const defaultJsDocTag = p
      .getJsDocTags()
      .find((info) => ['default', 'defaultValue'].includes(info.name));

    let typeName = project
      .getTypeChecker()
      .typeToString(
        subType.getNonNullableType(),
        undefined,
        ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      );

    if (subType.aliasSymbol && !subType.aliasTypeArguments) {
      typeName = subType.aliasSymbol.escapedName.toString();
    }

    return {
      name: p.getName(),
      description: ts.displayPartsToString(
        p.getDocumentationComment(project.getTypeChecker()),
      ),
      default: defaultJsDocTag?.text
        ? ts.displayPartsToString(defaultJsDocTag.text)
        : undefined,
      type: typeName,
    };
  });
}

export function AutoTypeTable({
  path,
  name,
}: {
  path: string;
  name: string;
}): JSX.Element {
  const output = generateDocumentation(
    path in shortcuts ? shortcuts[path] : path,
    name,
  );

  return (
    <TypeTable
      type={Object.fromEntries(
        output.map((entry) => [
          entry.name,
          {
            type: entry.type,
            description: entry.description,
            default: entry.default,
          },
        ]),
      )}
    />
  );
}
