import type { CompilerOptions } from '@/loaders/mdx/build-mdx';
import type { LoadFnOutput, LoadHook } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import type { SourceMap, TransformPluginContext } from 'rollup';
import type { TransformResult } from 'vite';
import { parse } from 'node:querystring';
import { ValidationError } from '@/utils/validation';
import path from 'node:path';
import type { LoaderContext } from 'webpack';

export interface LoaderInput {
  development: boolean;
  compiler: CompilerOptions;

  source: string;
  filePath: string;
  query: Record<string, string | string[] | undefined>;
}

export interface LoaderOutput {
  code: string;
  map?: unknown;
}

export type Loader = (input: LoaderInput) => Promise<LoaderOutput>;

export function toNode(
  loader: Loader,
  filterByPath: (filePath: string) => boolean,
): LoadHook {
  return async (url, _context, nextLoad): Promise<LoadFnOutput> => {
    if (!url.startsWith('file:///')) return nextLoad(url);

    const parsedUrl = new URL(url);
    const filePath = fileURLToPath(parsedUrl);

    if (filterByPath(filePath)) {
      const source = (await fs.readFile(filePath)).toString();

      const result = await loader({
        filePath,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        source,
        development: false,
        compiler: {
          addDependency() {},
        },
      });

      return {
        source: result.code,
        format: 'module',
        shortCircuit: true,
      };
    }

    return nextLoad(url);
  };
}

export type ViteLoader = (
  this: TransformPluginContext,
  file: string,
  query: string,
  value: string,
) => Promise<TransformResult | null>;

export function toVite(loader: Loader): ViteLoader {
  return async function (file, query, value) {
    const result = await loader({
      filePath: file,
      query: parse(query),
      source: value,
      development: this.environment.mode === 'dev',
      compiler: {
        addDependency: (file) => {
          this.addWatchFile(file);
        },
      },
    });

    return {
      code: result.code,
      map: result.map as SourceMap,
    };
  };
}

export type WebpackLoader = (
  this: LoaderContext<unknown>,
  source: string,
  callback: LoaderContext<unknown>['callback'],
) => Promise<void>;

export function toWebpack(loader: Loader): WebpackLoader {
  return async function (source, callback) {
    try {
      const result = await loader({
        filePath: this.resourcePath,
        query: parse(this.resourceQuery.slice(1)),
        source,
        development: this.mode === 'development',
        compiler: this,
      });

      callback(undefined, result.code, result.map as string);
    } catch (error) {
      if (error instanceof ValidationError) {
        return callback(new Error(error.toStringFormatted()));
      }

      if (!(error instanceof Error)) throw error;

      const fpath = path.relative(this.context, this.resourcePath);
      error.message = `${fpath}:${error.name}: ${error.message}`;
      callback(error);
    }
  };
}
