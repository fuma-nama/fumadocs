import {
  type ExportedDeclarations,
  Project,
  type Symbol as TsSymbol,
  ts,
  type Type,
} from 'ts-morph';
import { getProject, type TypescriptConfig } from '@/get-project';
import fs from 'node:fs';

export interface GeneratedDoc {
  name: string;
  description: string;
  entries: DocEntry[];
}

export interface DocEntry {
  name: string;
  description: string;
  type: string;
  tags: Record<string, string>;
  required: boolean;
}

interface EntryContext {
  program: Project;
  transform?: Transformer;
  type: Type;
  declaration: ExportedDeclarations;
}

type Transformer = (
  this: EntryContext,
  entry: DocEntry,
  propertyType: Type,
  propertySymbol: TsSymbol,
) => void;

export interface GenerateOptions {
  /**
   * Allow fields with `@internal` tag
   *
   * @defaultValue false
   */
  allowInternal?: boolean;

  /**
   * Modify output property entry
   */
  transform?: Transformer;
}

export type Generator = ReturnType<typeof createGenerator>;

export function createGenerator(config?: TypescriptConfig | Project) {
  const project = config instanceof Project ? config : getProject(config);

  return {
    generateDocumentation(
      file: {
        path: string;
        content?: string;
      },
      name: string | undefined,
      options: GenerateOptions = {},
    ) {
      const sourceFile = project.createSourceFile(
        file.path,
        file.content ?? fs.readFileSync(file.path).toString(),
        {
          overwrite: true,
        },
      );
      const out: GeneratedDoc[] = [];

      for (const [k, d] of sourceFile.getExportedDeclarations()) {
        if (name && name !== k) continue;

        if (d.length > 1)
          console.warn(
            `export ${k} should not have more than one type declaration.`,
          );

        out.push(generate(project, k, d[0], options));
      }

      return out;
    },
  };
}

/**
 * Generate documentation for properties in an exported type/interface
 *
 * @deprecated use `createGenerator` instead
 */
export function generateDocumentation(
  file: string,
  name: string | undefined,
  content: string,
  options: GenerateOptions & {
    /**
     * Typescript configurations
     */
    config?: TypescriptConfig;
    project?: Project;
  } = {},
): GeneratedDoc[] {
  const gen = createGenerator(options.project ?? options.config);

  return gen.generateDocumentation({ path: file, content }, name, options);
}

function generate(
  program: Project,
  name: string,
  declaration: ExportedDeclarations,
  { allowInternal = false, transform }: GenerateOptions,
): GeneratedDoc {
  const entryContext: EntryContext = {
    transform,
    program,
    type: declaration.getType(),
    declaration,
  };

  const comment = declaration
    .getSymbol()
    ?.compilerSymbol.getDocumentationComment(
      program.getTypeChecker().compilerObject,
    );

  return {
    name,
    description: comment ? ts.displayPartsToString(comment) : '',
    entries: declaration
      .getType()
      .getProperties()
      .map((prop) => getDocEntry(prop, entryContext))
      .filter(
        (entry) => entry && (allowInternal || !('internal' in entry.tags)),
      ) as DocEntry[],
  };
}

function getDocEntry(
  prop: TsSymbol,
  context: EntryContext,
): DocEntry | undefined {
  const { transform, program } = context;

  if (context.type.isClass() && prop.getName().startsWith('#')) {
    return;
  }

  const subType = program
    .getTypeChecker()
    .getTypeOfSymbolAtLocation(prop, context.declaration);
  const tags = Object.fromEntries(
    prop
      .getJsDocTags()
      .map((tag) => [tag.getName(), ts.displayPartsToString(tag.getText())]),
  );

  let typeName = subType
    .getNonNullableType()
    .getText(undefined, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);

  if (
    subType.getAliasSymbol() &&
    subType.getAliasTypeArguments().length === 0
  ) {
    typeName = subType.getAliasSymbol()?.getEscapedName() ?? typeName;
  }

  if ('remarks' in tags) {
    typeName = /^`(?<name>.+)`/.exec(tags.remarks)?.[1] ?? typeName;
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(
      prop.compilerSymbol.getDocumentationComment(
        program.getTypeChecker().compilerObject,
      ),
    ),
    tags,
    type: typeName,
    required: !prop.isOptional(),
  };

  transform?.call(context, entry, subType, prop);

  return entry;
}
