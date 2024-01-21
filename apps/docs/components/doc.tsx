import { Project, TypeFormatFlags } from 'ts-morph';
import { displayPartsToString } from 'typescript';
import { TypeTable } from 'fumadocs-ui/components/type-table';

interface DocEntry {
  name: string;
  description: string;
  type: string;
  default?: string;
}

/** Generate documentation for properties in a specific interface
 * @param name - interface name
 */
function generateDocumentation(fileNames: string[], name: string): DocEntry[] {
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
    skipAddingFilesFromTsConfig: true,
  });
  const output: DocEntry[] = [];
  project.addSourceFilesAtPaths(fileNames);

  for (const file of fileNames) {
    const sourceFile = project.getSourceFile(file);

    const typeAlias = sourceFile?.getTypeAlias(name);
    if (!typeAlias) continue;

    output.push(
      ...typeAlias
        .getType()
        .getProperties()
        .map<DocEntry>((p) => {
          const defaultJsDocTag = p
            .getJsDocTags()
            .find((info) =>
              ['default', 'defaultValue'].includes(info.getName()),
            );

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
            type: p
              .getTypeAtLocation(typeAlias)
              .getText(
                undefined,
                TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
              ),
          };
        }),
    );
  }

  return output;
}

export function AutoTypeTable({
  path,
  name,
}: {
  path: string;
  name: string;
}): JSX.Element {
  const output = generateDocumentation([path], name);

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
