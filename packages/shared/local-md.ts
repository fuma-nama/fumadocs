import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { renderStructuredData, type StructuredRecords } from './structured-data';
import { isDynamicPath, type MetaData, type PageData, type Params } from 'fumadocs-core/source';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import { createLocalSource, type SourceFile } from '@fumadocs/local-content';

export const defaultInclude = ['**/*.{md,mdx,json}', '**/meta{,.*}.{js,ts}'];

/** a compiled Markdown file */
interface MarkdownRendererBase {
  /** the structured data of the authored source, every branch */
  structuredData: StructuredData;
  render: () => Promise<{ exports: Record<string, unknown> }>;
}

/** a Markdown file with its frontmatter, `code` when it has frontmatter in code */
interface ParsedMarkdown {
  data: unknown;
  content: string;
  code: boolean;
}

export interface MarkdownPage<Frontmatter, Renderer> extends PageData {
  title: string;
  description?: string;
  icon?: string;
  content: string;
  frontmatter: Frontmatter;
  /** compile the page, at most once until the file is invalidated */
  load: () => Promise<Renderer>;
  structuredData: () => Promise<StructuredData>;
}

interface MarkdownSourceConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
  Renderer extends MarkdownRendererBase,
> {
  /** root directory for content files */
  dir: string;
  /** a list of glob patterns, customize the content files to be scanned */
  include?: string[];
  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
  /** compile a file once, the renderer of each page reads its params as props */
  compile: (
    file: SourceFile,
    parsed: ParsedMarkdown,
  ) => Promise<(props?: Record<string, unknown>) => Renderer>;
}

/**
 * The local Markdown source of `@fumadocs/local-md` and its Sätteri port, they differ in the compiler.
 *
 * A source of Markdown files and meta files. A page is a function of its params: its file compiles once, and the
 * content and outputs of the page at some params read them as props.
 */
export function createMarkdownSource<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
  Renderer extends MarkdownRendererBase,
>({
  dir,
  include = defaultInclude,
  frontmatterSchema = defaultSchemas.pageSchema as unknown as FrontmatterSchema,
  metaSchema = defaultSchemas.metaSchema as unknown as MetaSchema,
  compile,
}: MarkdownSourceConfig<FrontmatterSchema, MetaSchema, Renderer>) {
  type Frontmatter = StandardSchemaV1.InferOutput<FrontmatterSchema>;
  type Page = MarkdownPage<Frontmatter, Renderer>;
  type Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;

  /** compiled once per parsed file, which is cached until the file changes */
  const compiled = new WeakMap<
    ParsedMarkdown,
    Promise<(props?: Record<string, unknown>) => Renderer>
  >();
  function compiledOf(file: SourceFile, parsed: ParsedMarkdown) {
    let out = compiled.get(parsed);
    if (!out) compiled.set(parsed, (out = compile(file, parsed)));
    return out;
  }

  async function validate<T>(schema: StandardSchemaV1, file: SourceFile, value: unknown) {
    const result = await schema['~standard'].validate(value);
    if (!result.issues) return result.value as T;
    const issues = result.issues.map((issue) =>
      issue.path ? `${issue.path}: ${issue.message}` : issue.message,
    );
    throw new Error(`invalid data in "${file.absolutePath}": ${issues.join('\n')}`);
  }

  /** the content and outputs of a file for props: its params, and the custom props of `getPage()` */
  function bind(file: SourceFile, parsed: ParsedMarkdown, props?: Record<string, unknown>) {
    let loaded: Promise<Renderer> | undefined;
    const load = () => (loaded ??= compiledOf(file, parsed).then((create) => create(props)));
    return {
      load,
      async structuredData() {
        const renderer = await load();
        // Markdown has no code, and rendering it renders the body
        if (!file.path.endsWith('.mdx')) return renderer.structuredData;
        const { structuredData } = (await renderer.render()).exports as {
          structuredData?: StructuredRecords;
        };
        return structuredData
          ? renderStructuredData(structuredData, props ?? {})
          : renderer.structuredData;
      },
    };
  }

  /** the page at params, the frontmatter in code runs with them, the dynamic file itself has none */
  async function page(file: SourceFile, parsed: ParsedMarkdown, params?: Params): Promise<Page> {
    const bound = bind(file, parsed, params);
    let frontmatter = parsed.data as Frontmatter;
    if (!parsed.code || params || !isDynamicPath(file.path)) {
      const code = parsed.code
        ? (await (await bound.load()).render()).exports.frontmatter
        : undefined;
      frontmatter = await validate(frontmatterSchema, file, {
        ...(parsed.data as object),
        ...(code as object),
      });
    }
    const data = frontmatter as PageData & { _openapi?: unknown };

    return {
      title: data.title ?? path.basename(file.path, path.extname(file.path)),
      description: data.description,
      icon: data.icon,
      staticParams: data.staticParams,
      // for Fumadocs OpenAPI
      ['_openapi' as never]: data._openapi,

      content: parsed.content,
      frontmatter,
      ...bound,
    };
  }

  return createLocalSource<Page, Meta>({
    dir,
    integration: {
      include,
      async parse(file) {
        switch (path.extname(file.path)) {
          case '.json':
            return {
              type: 'meta',
              data: await validate<Meta>(metaSchema, file, JSON.parse(await file.read())),
            };
          case '.js':
          case '.ts': {
            // a new module after the file changes
            const url = pathToFileURL(file.absolutePath);
            url.searchParams.set('t', String(Date.now()));
            const { default: data, staticParams } = (await import(
              /* webpackIgnore: true */ /* @vite-ignore */ url.href
            )) as { default: Meta | ((params: Params) => Meta); staticParams?: Params[] };
            if (typeof data !== 'function')
              return {
                type: 'meta',
                data: await validate<Meta>(metaSchema, file, { staticParams, ...data }),
              };
            return {
              type: 'meta',
              data: { staticParams } as Meta,
              dataAt: (params) =>
                validate<Meta>(metaSchema, file, { staticParams, ...data(params) }),
            };
          }
          case '.md':
          case '.mdx': {
            const { data, content } = parseFrontmatter(await file.read());
            const code = file.path.endsWith('.mdx') && /^export const frontmatter\b/m.test(content);
            const parsed: ParsedMarkdown = { data, content, code };
            return {
              type: 'page',
              data: await page(file, parsed),
              // the file is compiled once, custom props only bind its content and outputs
              dataAt: (params, custom) =>
                custom
                  ? { ...custom.data, ...bind(file, parsed, { ...params, ...custom.props }) }
                  : page(file, parsed, params),
            };
          }
        }
      },
    },
  });
}
