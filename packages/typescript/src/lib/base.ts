import {
  type Checker,
  isObjectType,
  NodeBuilderFlags,
  ObjectFlags,
  type Project as TsProject,
  type Symbol as TsSymbol,
  SymbolFlags,
  type Type,
} from 'typescript/unstable/sync';
import type { Node } from 'typescript/unstable/ast';
import fs from 'node:fs/promises';
import {
  type BaseTypeTableProps,
  type GenerateTypeTableOptions,
  getTypeTableOutput,
} from '@/lib/type-table';
import path from 'node:path';
import { generateHash, type Cache } from '@/cache';
import { version as packageVersion } from '../../package.json';
import { getSimpleForm, type TypeSimplifierOptions } from '@/lib/get-simple-form';
import { createProject, type Project, type TypescriptConfig } from '@/lib/project';

export { createProject, type Project, type TypescriptConfig };

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
  /**
   * The TypeScript project (from `typescript/unstable/sync`) containing the declaration.
   */
  program: TsProject;
  checker: Checker;
  type: Type;
  declaration: Node;
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

  typeSimplifier?: TypeSimplifierOptions;
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

export function createGenerator(options: GeneratorOptions = {}) {
  const cache = options?.cache ? options.cache : null;
  let instance: Project | Promise<Project> | undefined = options?.project;

  function getProject() {
    if (instance) return instance;
    return (instance = createProject(options));
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
      const content = file.content ?? (await fs.readFile(fullPath, 'utf-8'));
      let cacheKey: string | undefined;
      if (cache) {
        cacheKey = generateHash(`${file.path}:${name}:${content}:${packageVersion}`);
        const cached = (await cache.read(cacheKey)) as GeneratedDoc[] | undefined;
        if (cached) return cached;
      }

      const project = await getProject();
      const loaded = project.getSourceFile(fullPath, file.content);
      if (!loaded) throw new Error(`failed to load ${fullPath} into TypeScript project.`);

      const { project: tsProject, sourceFile } = loaded;
      const { checker } = tsProject;
      const out: GeneratedDoc[] = [];
      const moduleSymbol = name ? checker.getSymbolAtLocation(sourceFile) : undefined;

      if (moduleSymbol && name) {
        for (const exported of checker.getExportsOfModule(moduleSymbol)) {
          if (exported.name !== name) continue;

          const symbol =
            (exported.flags & SymbolFlags.Alias) !== 0
              ? checker.getAliasedSymbol(exported)
              : exported;
          if (symbol.declarations.length === 0) continue;
          if (symbol.declarations.length > 1)
            console.warn(`export ${name} should not have more than one type declaration.`);

          const declaration = symbol.declarations[0].resolve(tsProject);
          if (!declaration) continue;
          const type = checker.getTypeAtLocation(declaration);
          if (!type) continue;

          const entryContext: EntryContext = {
            ...options,
            program: tsProject,
            checker,
            type,
            declaration,
          };
          out.push(
            generate(encodeURI(`${path.basename(file.path)}-${name}`), name, symbol, entryContext),
          );
        }
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

function generate(
  id: string,
  name: string,
  symbol: TsSymbol,
  entryContext: EntryContext,
): GeneratedDoc {
  const { checker, type } = entryContext;
  const entries: DocEntry[] = [];
  for (const prop of checker.getPropertiesOfType(type)) {
    const out = getDocEntry(prop, entryContext);
    if (out) entries.push(out);
  }

  return {
    id,
    name,
    description: checker.getDocumentationCommentOfSymbol(symbol),
    entries,
  };
}

function isClassType(type: Type): boolean {
  return isObjectType(type) && (type.objectFlags & ObjectFlags.Class) !== 0;
}

/**
 * Private class members (`#name`) are exposed with their escaped name (`__#1@#name`) by TypeScript.
 */
function isPrivateIdentifierName(name: string): boolean {
  return name.startsWith('#') || name.startsWith('__#');
}

function getDocEntry(prop: TsSymbol, context: EntryContext): DocEntry | undefined {
  const { transform, allowInternal = false, checker, declaration } = context;
  if (isClassType(context.type) && isPrivateIdentifierName(prop.name)) {
    return;
  }

  const subType = checker.getTypeOfSymbolAtLocation(prop, declaration);
  const isOptional = (prop.flags & SymbolFlags.Optional) !== 0;
  const tags: RawTag[] = [];

  for (const tag of checker.getJsDocTagsOfSymbol(prop)) {
    if (!allowInternal && tag.name === 'internal') return;

    tags.push({
      name: tag.name,
      text: tag.text ?? '',
    });
  }

  const entry: DocEntry = {
    name: prop.name,
    description: checker.getDocumentationCommentOfSymbol(prop),
    tags,
    type: checker.typeToString(
      subType,
      declaration,
      NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope | NodeBuilderFlags.NoTruncation,
    ),
    simplifiedType: getSimpleForm(subType, checker, declaration, {
      ...context.typeSimplifier,
      noUndefined: isOptional,
    }),
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
