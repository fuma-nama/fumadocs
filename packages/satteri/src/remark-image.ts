import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMdastPlugin } from 'satteri';
import type { Image, RootContent } from 'mdast';
import type { MdxJsxFlowElement, MdxjsEsm } from 'mdast-util-mdx';
import { replaceChildAt } from '@/utils';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

type ExternalImageOptions = { timeout?: number } | boolean;

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
}: RemarkImageOptions = {}) {
  return () => {
    const imports: MdxjsEsm[] = [];

    return defineMdastPlugin({
      name: 'remark-image',
      async image(node, ctx) {
        const parent = ctx.parent(node);
        const index = ctx.indexOf(node);
        if (!parent || index === undefined) return;

        const dir = ctx.fileURL ? path.dirname(fileURLToPath(ctx.fileURL)) : undefined;
        const src = parseSrc(decodeURI(node.url), publicDir, dir);
        if (!src) return;

        try {
          const replacement = await updateImage(src, node, {
            placeholder,
            useImport,
            external,
            dir,
            imports,
          });
          if (replacement) {
            ctx.setProperty(parent, 'children', replaceChildAt(parent.children, index, replacement));
          }
        } catch (error) {
          if (onError === 'hide') {
            ctx.removeNode(node);
          } else if (onError === 'ignore' || node.url.endsWith('.svg')) {
            return;
          } else if (typeof onError === 'function') {
            onError(error as Error);
          } else {
            throw error;
          }
        }

        if (imports.length > 0) {
          ctx.data._imageImports = imports;
        }
      },
    });
  };
}

async function updateImage(
  src: Source,
  node: Image,
  options: {
    placeholder: 'blur' | 'none';
    useImport: boolean;
    external: ExternalImageOptions;
    dir?: string;
    imports: MdxjsEsm[];
  },
): Promise<RootContent | undefined> {
  if (src.type === 'file' && options.useImport) {
    if (!options.dir) {
      throw new Error(
        'When `useImport` is enabled, pass `fileURL` to the compiler so image paths can be resolved.',
      );
    }

    const variableName = `__img${options.imports.length}`;
    const importPath = getImportPath(src.file, options.dir);
    options.imports.push({
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ImportDeclaration',
              attributes: [],
              source: { type: 'Literal', value: importPath },
              specifiers: [
                {
                  type: 'ImportDefaultSpecifier',
                  local: { type: 'Identifier', name: variableName },
                },
              ],
            },
          ],
        },
      },
    });

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

    if (options.placeholder === 'blur' && VALID_BLUR_EXT.some((ext) => src.file.endsWith(ext))) {
      out.attributes.push({ type: 'mdxJsxAttribute', name: 'placeholder', value: 'blur' });
    }

    return out;
  }

  const size = await getImageSize(src, options.external);
  if (!size) return;

  node.data ??= {};
  const props = ((node.data as { hProperties?: Record<string, string> }).hProperties ??= {});
  props.src = src.type === 'url' ? src.url.href : node.url;
  props.width = size.width.toString();
  props.height = size.height.toString();
  return node;
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

async function getImageSize(src: Source, onExternal: ExternalImageOptions) {
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
