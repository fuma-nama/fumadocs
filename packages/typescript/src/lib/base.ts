import {
  type ExportedDeclarations,
  Project,
  type Symbol as TsSymbol,
  ts,
  type Type,
} from 'ts-morph';
import { createProject, type TypescriptConfig } from '@/create-project';
import fs from 'node:fs';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
  getTypeTableOutput,
} from '@/lib/type-table';
import { createCache } from '@/lib/cache';
import path from 'node:path';

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
  deprecated: boolean;
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

export interface GeneratorOptions extends TypescriptConfig {
  /**
   * cache results, note that some options are not marked as dependency.
   *
   * @defaultValue fs
   */
  cache?: 'fs' | false;

  project?: Project;
}

export function createGenerator(config?: GeneratorOptions | Project) {
  const options =
    config instanceof Project
      ? {
          project: config,
        }
      : config;
  const cacheType = options?.cache ?? 'fs';
  const cache = cacheType === 'fs' ? createCache() : null;
  let instance: Project | undefined;

  function getProject() {
    instance ??= options?.project ?? createProject(options);
    return instance;
  }

  return {
    generateDocumentation(
      file: {
        path: string;
        content?: string;
      },
      name: string | undefined,
      options?: GenerateOptions,
    ) {
      const content =
        file.content ?? fs.readFileSync(path.resolve(file.path)).toString();
      const cacheKey = `${file.path}:${name}:${content}`;
      if (cache) {
        const cached = cache.read(cacheKey) as GeneratedDoc[] | undefined;
        if (cached) return cached;
      }
      const sourceFile = getProject().createSourceFile(file.path, content, {
        overwrite: true,
      });
      const out: GeneratedDoc[] = [];

      for (const [k, d] of sourceFile.getExportedDeclarations()) {
        if (name && name !== k) continue;

        if (d.length > 1)
          console.warn(
            `export ${k} should not have more than one type declaration.`,
          );

        out.push(generate(getProject(), k, d[0], options));
      }

      cache?.write(cacheKey, out);
      return out;
    },
    generateTypeTable(
      props: BaseTypeTableProps,
      options?: GenerateTypeTableOptions,
    ) {
      return getTypeTableOutput(this, props, options);
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
  { allowInternal = false, transform }: GenerateOptions = {},
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

  let typeName = subType.getText(
    undefined,
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );

  if (
    subType.getAliasSymbol() &&
    subType.getAliasTypeArguments().length === 0
  ) {
    typeName = subType.getAliasSymbol()?.getEscapedName() ?? typeName;
  }

  if (prop.isOptional() && typeName.endsWith('| undefined')) {
    typeName = typeName
      .slice(0, typeName.length - '| undefined'.length)
      .trimEnd();
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
    deprecated: prop
      .getJsDocTags()
      .some((tag) => tag.getName() === 'deprecated'),
  };

  transform?.call(context, entry, subType, prop);

  return entry;
}
