import type { ExportedDeclarations, Symbol as TsSymbol, Project, Type } from 'ts-morph';
import fs from 'node:fs/promises';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
  getTypeTableOutput,
} from '@/lib/type-table';
import path from 'node:path';
import { generateHash, type Cache } from '@/cache';
import { version as packageVersion } from '../../package.json';

export interface GeneratedDoc {
  /**
   * unique ID generated from file name & export declaration.
   */
  id: string;
  name: string;
  description?: string;
  entries: DocEntry[];
}

export interface DocEntry {
  name: string;
  description: string;
  type: string;
  typeHref?: string;
  simplifiedType: string;

  tags: RawTag[];
  required: boolean;
  deprecated: boolean;
}

export interface RawTag {
  name: string;
  text: string;
}

interface EntryContext extends GenerateOptions {
  program: Project;
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
   * @defaultValue false
   */
  cache?: Cache | false;

  project?: Project;
}

export interface TypescriptConfig {
  tsconfigPath?: string;
}

export async function createProject(options: TypescriptConfig = {}): Promise<Project> {
  const { Project } = await import('ts-morph');
  return new Project({
    tsConfigFilePath: options.tsconfigPath ?? './tsconfig.json',
    skipAddingFilesFromTsConfig: true,
  });
}

export function createGenerator(options: GeneratorOptions = {}) {
  const cache = options?.cache ? options.cache : null;
  let instance: Project | Promise<Project> | undefined = options?.project;

  function getProject() {
    if (instance) return instance;
    return (instance = createProject(options));
  }

  function getSourceFile(project: Project, filePath: string, fileContent: string) {
    const ext = path.extname(filePath);
    const fileBase = filePath.slice(0, -ext.length);
    let i = 0;
    let sourceFile = project.getSourceFile(filePath);

    while (sourceFile && sourceFile.getFullText() !== fileContent) {
      filePath = `${fileBase}.${i++}${ext}`;
      sourceFile = project.getSourceFile(filePath);
    }

    if (sourceFile) return sourceFile;
    return project.createSourceFile(filePath, fileContent, { overwrite: true });
  }

  return {
    async generateDocumentation(
      file: {
        path: string;
        content?: string;
      },
      name: string | undefined,
      options: GenerateOptions = {},
    ) {
      const fullPath = path.resolve(file.path);
      const content = file.content ?? (await fs.readFile(fullPath)).toString();
      let cacheKey: string | undefined;
      if (cache) {
        cacheKey = generateHash(`${file.path}:${name}:${content}:${packageVersion}`);
        const cached = (await cache.read(cacheKey)) as GeneratedDoc[] | undefined;
        if (cached) return cached;
      }

      const project = await getProject();
      const sourceFile = getSourceFile(project, fullPath, content);
      const out: GeneratedDoc[] = [];

      for (const [k, d] of sourceFile.getExportedDeclarations()) {
        if (d.length === 0 || !name || name !== k) continue;

        if (d.length > 1)
          console.warn(`export ${k} should not have more than one type declaration.`);

        const declaration = d[0];
        const entryContext: EntryContext = {
          ...options,
          program: project,
          type: declaration.getType(),
          declaration,
        };
        out.push(await generate(encodeURI(`${path.basename(file.path)}-${name}`), k, entryContext));
      }

      if (cache && cacheKey) {
        await cache.write(cacheKey, out);
      }
      return out;
    },
    generateTypeTable(props: BaseTypeTableProps, options?: GenerateTypeTableOptions) {
      return getTypeTableOutput(this, props, options);
    },
  };
}

async function generate(
  id: string,
  name: string,
  entryContext: EntryContext,
): Promise<GeneratedDoc> {
  const { ts } = await import('ts-morph');
  const { declaration, program } = entryContext;

  const comment = declaration
    .getSymbol()
    ?.compilerSymbol.getDocumentationComment(program.getTypeChecker().compilerObject);
  const entries: DocEntry[] = [];
  for (const prop of declaration.getType().getProperties()) {
    const out = await getDocEntry(prop, entryContext);
    if (out) entries.push(out);
  }

  return {
    id,
    name,
    description: comment ? ts.displayPartsToString(comment) : undefined,
    entries,
  };
}

async function getDocEntry(prop: TsSymbol, context: EntryContext): Promise<DocEntry | undefined> {
  const { ts } = await import('ts-morph');
  const { getSimpleForm } = await import('@/lib/get-simple-form');
  const { transform, allowInternal = false, program } = context;
  if (context.type.isClass() && prop.getName().startsWith('#')) {
    return;
  }

  const subType = prop.getTypeAtLocation(context.declaration);
  const isOptional = prop.isOptional();
  const tags: RawTag[] = [];

  for (const tag of prop.getJsDocTags()) {
    if (!allowInternal && tag.getName() === 'internal') return;

    tags.push({
      name: tag.getName(),
      text: ts.displayPartsToString(tag.getText()),
    });
  }

  const entry: DocEntry = {
    name: prop.getName(),
    description: ts.displayPartsToString(
      prop.compilerSymbol.getDocumentationComment(program.getTypeChecker().compilerObject),
    ),
    tags,
    type: subType.getText(
      context.declaration,
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.NoTruncation,
    ),
    simplifiedType: getSimpleForm(
      subType,
      program.getTypeChecker(),
      isOptional,
      context.declaration,
    ),
    required: !isOptional,
    deprecated: false,
  };

  for (const tag of tags) {
    switch (tag.name) {
      case 'fumadocsType': {
        // replace full type with @fumadocsType
        const match = /`(?<name>.+)`$/.exec(tag.text)?.[1];
        if (match) entry.type = match;
        break;
      }
      case 'remarks': {
        // replace simplified type with @remarks
        const match = /^`(?<name>.+)`/.exec(tag.text)?.[1];
        if (match) entry.simplifiedType = match;
        break;
      }
      case 'fumadocsHref': {
        // add anchor to output property type
        const content = tag.text.trim();
        if (content.length > 0) entry.typeHref = content;
        break;
      }
      case 'deprecated': {
        entry.deprecated = true;
        break;
      }
    }
  }

  transform?.call(context, entry, subType, prop);

  return entry;
}
