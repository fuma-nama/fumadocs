import { pathToFileURL } from 'node:url';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Core } from '@/core';
import type { DocCollectionItem } from '@/config/build';
import type { CompilerOptions } from '@/loaders/mdx/build-mdx';
import type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import { getSatteriOptions } from '@/config/build-satteri';
import { compileMdx, remarkLlms } from '@fumadocs/satteri';
import { defineMdastPlugin, type Data, type MdastPluginInput, type MdastVisitorContext } from 'satteri';
import '@fumadocs/satteri/data-map';
import '@/loaders/mdx/satteri-data-map';
import { remarkIncludeSatteri } from '@/loaders/mdx/remark-include-satteri';

interface BuildSatteriMDXOptions {
  filePath: string;
  source: string;
  frontmatter?: Record<string, unknown>;
  environment: 'bundler' | 'runtime';
  isDevelopment: boolean;
  _compiler?: CompilerOptions;
}

export interface CompiledSatteriMDXProperties<Frontmatter = Record<string, unknown>> {
  frontmatter: Frontmatter;
  structuredData: StructuredData;
  toc: TOCItemType[];
  default: FC<MDXProps>;
  _markdown?: string;
  _mdast?: string;
}

export async function buildSatteriMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  {
    filePath,
    frontmatter,
    source,
    _compiler,
    environment,
    isDevelopment,
  }: BuildSatteriMDXOptions,
): Promise<{ value: string }> {
  const satteriOptions = await getSatteriOptions(core.getConfig(), collection, environment);
  const postprocess: PostprocessOptions = {
    _format: filePath.endsWith('.mdx') ? 'mdx' : 'md',
    ...collection?.postprocess,
  };

  const data: Data = {
    frontmatter,
    _compiler,
    _cwd: collection?.cwd,
    _valueToExport: collection?.postprocess?.valueToExport,
  };

  const postprocessPlugins: MdastPluginInput[] = [postprocessPlugin(postprocess)];
  if (postprocess.includeProcessedMarkdown) {
    postprocessPlugins.unshift(
      remarkLlms(
        typeof postprocess.includeProcessedMarkdown === 'object'
          ? postprocess.includeProcessedMarkdown
          : undefined,
      ),
    );
  }

  const result = await compileMdx({
    source,
    filePath,
    frontmatter,
    isDevelopment,
    environment,
    options: {
      ...satteriOptions,
      fileURL: pathToFileURL(filePath),
      data,
      mdastPlugins: [
        remarkIncludeSatteri({ cwd: collection?.cwd }),
        ...(satteriOptions.mdastPlugins ?? []),
        ...postprocessPlugins,
      ],
    },
  });

  return { value: result.code };
}

function postprocessPlugin(options: PostprocessOptions) {
  return defineMdastPlugin({
    name: 'remark-postprocess',
    heading(node, ctx: MdastVisitorContext) {
      const frontmatter = (ctx.data.frontmatter ??= {});
      if (!frontmatter.title && node.depth === 1) {
        frontmatter.title = ctx.textContent(node);
      }
    },
    link(node, ctx) {
      if (!options.extractLinkReferences) return;
      const refs = (ctx.data.extractedReferences ??= []);
      refs.push({ href: node.url });
    },
  });
}
