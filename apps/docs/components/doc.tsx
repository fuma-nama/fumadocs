import { Project } from 'ts-morph';
import { displayPartsToString, TypeFormatFlags } from 'typescript';
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

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

/** Generate documentation for properties in a specific interface
 * @param name - interface name
 */
function generateDocumentation(file: string, name: string): DocEntry[] {
  project.addSourceFileAtPath(file);
  const sourceFile = project.getSourceFile(file);

  const typeAlias = sourceFile?.getTypeAlias(name);
  if (!sourceFile || !typeAlias) return [];

  return typeAlias
    .getType()
    .getProperties()
    .map<DocEntry>((p) => {
      const type = p.getTypeAtLocation(typeAlias);
      const defaultJsDocTag = p
        .getJsDocTags()
        .find((info) => ['default', 'defaultValue'].includes(info.getName()));

      let typeName = type
        .getNonNullableType()
        .getText(undefined, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);

      if (type.compilerType.aliasSymbol) {
        typeName = type.compilerType.aliasSymbol.escapedName.toString();
      }

      return {
        name: p.getName(),
        description: displayPartsToString(
          p.compilerSymbol.getDocumentationComment(
            project.getTypeChecker().compilerObject,
          ),
        ),
        default: defaultJsDocTag
          ? displayPartsToString(defaultJsDocTag.getText())
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
