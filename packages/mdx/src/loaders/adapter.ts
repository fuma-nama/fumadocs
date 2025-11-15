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
import { readFileSync } from 'node:fs';

export interface LoaderInput {
  development: boolean;
  compiler: CompilerOptions;

  filePath: string;
  query: Record<string, string | string[] | undefined>;
  getSource: () => string | Promise<string>;
}

export interface LoaderOutput {
  code: string;
  map?: unknown;
}

type Awaitable<T> = T | Promise<T>;

export interface Loader {
  /**
   * Filter file paths, the input can be either a file URL or file path.
   *
   * Must take resource query into consideration.
   */
  test?: RegExp;

  /**
   * Transform input into JavaScript.
   *
   * Returns:
   * - `LoaderOutput`: JavaScript code & source map.
   * - `null`: skip the loader. Fallback to default behaviour if possible, otherwise the adapter will try workarounds.
   */
  load: (input: LoaderInput) => Awaitable<LoaderOutput | null>;

  bun?: {
    /**
     * 1. Bun doesn't allow `null` in loaders.
     * 2. Bun requires sync result to support dynamic require().
     */
    load?: (source: string, input: LoaderInput) => Awaitable<Bun.OnLoadResult>;
  };
}

export function toNode(loader: Loader): LoadHook {
  return async (url, _context, nextLoad): Promise<LoadFnOutput> => {
    if (url.startsWith('file:///') && (!loader.test || loader.test.test(url))) {
      const parsedUrl = new URL(url);
      const filePath = fileURLToPath(parsedUrl);

      const result = await loader.load({
        filePath,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        async getSource() {
          return (await fs.readFile(filePath)).toString();
        },
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

export interface ViteLoader {
  filter: (id: string) => boolean;

  transform: (
    this: TransformPluginContext,
    value: string,
    id: string,
  ) => Promise<TransformResult | null>;
}

export function toVite(loader: Loader): ViteLoader {
  return {
    filter(id) {
      return !loader.test || loader.test.test(id);
    },
    async transform(value, id) {
      const [file, query = ''] = id.split('?', 2);

      const result = await loader.load({
        filePath: file,
        query: parse(query),
        getSource() {
          return value;
        },
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
    },
  };
}

export type WebpackLoader = (
  this: LoaderContext<unknown>,
  source: string,
  callback: LoaderContext<unknown>['callback'],
) => Promise<void>;

/**
 * need to handle the `test` regex in Webpack config instead.
 */
export function toWebpack(loader: Loader): WebpackLoader {
  return async function (source, callback) {
    try {
      const result = await loader.load({
        filePath: this.resourcePath,
        query: parse(this.resourceQuery.slice(1)),
        getSource() {
          return source;
        },
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
        return callback(new Error(await error.toStringFormatted()));
      }

      if (!(error instanceof Error)) throw error;

      const fpath = path.relative(this.context, this.resourcePath);
      error.message = `${fpath}:${error.name}: ${error.message}`;
      callback(error);
    }
  };
}

export function toBun(loader: Loader) {
  function toResult(output: LoaderOutput | null): Bun.OnLoadResult {
    // it errors, treat this as an exception
    if (!output) return;

    return {
      contents: output.code,
      loader: 'js',
    };
  }

  return (build: Bun.PluginBuilder) => {
    // avoid using async here, because it will cause dynamic require() to fail
    build.onLoad({ filter: loader.test ?? /.+/ }, (args) => {
      const [filePath, query = ''] = args.path.split('?', 2);
      const input: LoaderInput = {
        async getSource() {
          return Bun.file(filePath).text();
        },
        query: parse(query),
        filePath,
        development: false,
        compiler: {
          addDependency() {},
        },
      };

      if (loader.bun?.load) {
        return loader.bun.load(readFileSync(filePath).toString(), input);
      }

      const result = loader.load(input);
      if (result instanceof Promise) {
        return result.then(toResult);
      }
      return toResult(result);
    });
  };
}
