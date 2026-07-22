import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Image } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import type { ExtraPluginHooks } from './compile';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

type ExternalImageOptions = { timeout?: number } | boolean;
type ImageSize = { width: number; height: number };

export interface RemarkImageOptions {
  publicDir?: string;
  placeholder?: 'blur' | 'none';
  onError?: 'error' | 'hide' | 'ignore' | ((error: Error) => void);
  useImport?: boolean;
  external?: ExternalImageOptions;
}

type Source = { type: 'url'; url: URL } | { type: 'file'; file: string };

export function remarkImage({
  placeholder = 'none',
  external = true,
  useImport = true,
  onError = 'error',
  publicDir = path.join(process.cwd(), 'public'),
}: RemarkImageOptions = {}): MdastPluginDefinition & ExtraPluginHooks {
  // image sizes don't change within a build, share the cache across files
  const sizeCache = new Map<string, Promise<ImageSize | undefined>>();

  return {
    name: 'remark-image',
    afterToJs({ result, outputFormat }) {
      // `import` statements, only valid in an ES module. use `useImport: false` at runtime
      if (outputFormat === 'program' && result.data._imageImports) {
        result.code += `\n${result.data._imageImports.join('\n')}`;
      }
    },
    async image(node, ctx) {
      const dir = ctx.fileURL ? path.dirname(fileURLToPath(ctx.fileURL)) : undefined;
      const src = parseSrc(decodeURI(node.url), publicDir, dir);
      if (!src) return;

      try {
        // mutations are recorded per-node inside `updateImage`; replacing
        // the parent's children instead would clobber sibling image patches
        await updateImage(src, node, ctx, {
          placeholder,
          useImport,
          external,
          dir,
          sizeCache,
        });
      } catch (error) {
        // svg sizes often can't be determined, always keep the node untouched
        if (onError === 'ignore' || node.url.endsWith('.svg')) {
          return;
        } else if (onError === 'hide') {
          ctx.removeNode(node);
        } else if (typeof onError === 'function') {
          onError(error as Error);
        } else {
          throw error;
        }
      }
    },
  };
}

async function updateImage(
  src: Source,
  node: Image,
  ctx: MdastVisitorContext,
  options: {
    placeholder: 'blur' | 'none';
    useImport: boolean;
    external: ExternalImageOptions;
    dir?: string;
    sizeCache: Map<string, Promise<ImageSize | undefined>>;
  },
): Promise<void> {
  if (src.type === 'file' && options.useImport) {
    if (!options.dir) {
      throw new Error(
        'When `useImport` is enabled, pass `fileURL` to the compiler so image paths can be resolved.',
      );
    }

    const imports = (ctx.data._imageImports ??= []);
    const variableName = `__img${imports.length}`;
    const importPath = getImportPath(src.file, options.dir);
    imports.push(`import ${variableName} from ${JSON.stringify(importPath)};`);

    const out: MdxJsxFlowElement = {
      type: 'mdxJsxFlowElement',
      name: 'img',
      children: [],
      attributes: [
        { type: 'mdxJsxAttribute', name: 'alt', value: node.alt ?? 'image' },
        {
          type: 'mdxJsxAttribute',
          name: 'src',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: variableName,
            data: {
              estree: {
                type: 'Program',
                sourceType: 'module',
                body: [
                  {
                    type: 'ExpressionStatement',
                    expression: { type: 'Identifier', name: variableName },
                  },
                ],
              },
            },
          },
        },
      ],
    };

    if (node.title) {
      out.attributes.push({ type: 'mdxJsxAttribute', name: 'title', value: node.title });
    }

    if (options.placeholder === 'blur' && VALID_BLUR_EXT.some((ext) => src.file.endsWith(ext))) {
      out.attributes.push({ type: 'mdxJsxAttribute', name: 'placeholder', value: 'blur' });
    }

    ctx.replaceNode(node, out);
    return;
  }

  const size = await getImageSize(src, options.external, options.sizeCache);
  if (!size) return;

  // record via `setProperty` — in-place JS mutations to the visited node are
  // not written back to the tree
  const data = { ...(node.data as Record<string, unknown> | undefined) };
  const props = { ...(data.hProperties as Record<string, string> | undefined) };
  props.src = src.type === 'url' ? src.url.href : node.url;
  props.width = size.width.toString();
  props.height = size.height.toString();
  data.hProperties = props;
  ctx.setProperty(node, 'data', data);
}

function getImportPath(file: string, dir: string): string {
  const relative = path.relative(dir, file).replaceAll(path.sep, '/');
  return relative.startsWith('../') ? relative : `./${relative}`;
}

function parseSrc(src: string, publicDir: string, dir?: string): Source | undefined {
  if (src.startsWith('file:///')) return { type: 'file', file: fileURLToPath(src) };
  if (EXTERNAL_URL_REGEX.test(src)) return { type: 'url', url: new URL(src) };

  if (src.startsWith('/')) {
    if (EXTERNAL_URL_REGEX.test(publicDir)) {
      const url = new URL(publicDir);
      const segs = [...url.pathname.split('/'), ...src.split('/')].filter((v) => v.length > 0);
      url.pathname = `/${segs.join('/')}`;
      return { type: 'url', url };
    }
    return { type: 'file', file: path.join(publicDir, src) };
  }

  if (!dir) return;
  return { type: 'file', file: path.join(dir, src) };
}

function getSizeCacheKey(src: Source, onExternal: ExternalImageOptions): string {
  if (src.type === 'file') return `file:${src.file}`;

  const timeout = typeof onExternal === 'object' ? onExternal.timeout : undefined;
  return `url:${timeout ?? ''}:${src.url.href}`;
}

async function getImageSize(
  src: Source,
  onExternal: ExternalImageOptions,
  cache?: Map<string, Promise<ImageSize | undefined>>,
): Promise<ImageSize | undefined> {
  if (!cache) return loadImageSize(src, onExternal);

  const key = getSizeCacheKey(src, onExternal);
  const cached = cache.get(key);
  if (cached) return cached;

  const result = loadImageSize(src, onExternal);
  cache.set(key, result);
  return result;
}

async function loadImageSize(
  src: Source,
  onExternal: ExternalImageOptions,
): Promise<ImageSize | undefined> {
  if (src.type === 'file') {
    const { imageSizeFromFile } = await import('image-size/fromFile');
    return imageSizeFromFile(src.file);
  }
  if (onExternal === false) return;

  const { timeout } = typeof onExternal === 'object' ? onExternal : {};
  const res = await fetch(src.url, {
    signal: typeof timeout === 'number' ? AbortSignal.timeout(timeout) : undefined,
  });
  if (!res.ok) {
    throw new Error(`[Remark Image] Failed to fetch ${src.url} (${res.status})`);
  }

  const { imageSize } = await import('image-size');
  return imageSize(new Uint8Array(await res.arrayBuffer()));
}

export { parseSrc, getImageSize };
