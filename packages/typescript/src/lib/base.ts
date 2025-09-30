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
import { getSimpleForm } from '@/lib/get-simple-form';

export interface GeneratedDoc {
  name: string;
  description: string;
  entries: DocEntry[];
}

export interface DocEntry {
  name: string;
  description: string;
  type: string;
  simplifiedType: string;

  tags: RawTag[];
  required: boolean;
  deprecated: boolean;
}

export interface RawTag {
  name: string;
  text: string;
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
  const cacheType =
    options?.cache ?? (process.env.NODE_ENV !== 'development' ? 'fs' : false);
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

  const subType = prop.getTypeAtLocation(context.declaration);
  const isOptional = prop.isOptional();
  const tags = prop.getJsDocTags().map(
    (tag) =>
      ({
        name: tag.getName(),
        text: ts.displayPartsToString(tag.getText()),
      }) satisfies RawTag,
  );

  let simplifiedType = getSimpleForm(
    subType,
    program.getTypeChecker(),
    isOptional,
    context.declaration,
  );

  const remarksTag = tags.find((tag) => tag.name === 'remarks');
  if (remarksTag) {
    const match = /^`(?<name>.+)`/.exec(remarksTag.text)?.[1];

    // replace type with @remarks
    if (match) simplifiedType = match;
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(
      prop.compilerSymbol.getDocumentationComment(
        program.getTypeChecker().compilerObject,
      ),
    ),
    tags,
    type: subType.getText(
      context.declaration,
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
        ts.TypeFormatFlags.NoTruncation,
    ),
    simplifiedType,
    required: !isOptional,
    deprecated: tags.some((tag) => tag.name === 'deprecated'),
  };

  transform?.call(context, entry, subType, prop);

  return entry;
}
