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

export type Loader = (input: LoaderInput) => Promise<LoaderOutput | null>;

export function toNode(loader: Loader, test: RegExp): LoadHook {
  return async (url, _context, nextLoad): Promise<LoadFnOutput> => {
    if (url.startsWith('file:///') && test.test(url)) {
      const parsedUrl = new URL(url);
      const filePath = fileURLToPath(parsedUrl);
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

      if (result) {
        return {
          source: result.code,
          format: 'module',
          shortCircuit: true,
        };
      }
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

    if (result === null) return null;
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

      if (result === null) {
        callback(undefined, source);
      } else {
        callback(undefined, result.code, result.map as string);
      }
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

export function toBun(loader: Loader, test: RegExp) {
  return (build: Bun.PluginBuilder) => {
    const queryData = new Map<
      string,
      Record<string, string | undefined | string[]>
    >();

    build.onResolve({ filter: test }, (args) => {
      const [filePath, query = ''] = args.path.split('?', 2);

      // TODO: this isn't working because `args.path` still doesn't include query string
      queryData.set(filePath, parse(query));
      return null;
    });

    build.onLoad({ filter: test }, async (args) => {
      const content = await Bun.file(args.path).text();

      const result = await loader({
        source: content,
        query: queryData.get(args.path) ?? {},
        filePath: args.path,
        development: false,
        compiler: {
          addDependency() {},
        },
      });

      // must return something, no fallback: https://github.com/oven-sh/bun/issues/5303
      if (result === null) {
        return {
          contents: content,
          loader: args.loader,
        };
      }

      return {
        contents: result.code,
        loader: 'js',
      };
    });
  };
}
