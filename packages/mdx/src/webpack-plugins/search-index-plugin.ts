/* eslint-disable @typescript-eslint/consistent-type-imports -- Webpack */
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import { createGetUrl } from 'fumadocs-core/source';
import type { Compiler } from 'webpack';

const require = createRequire(import.meta.url);

const pkg = require('next/dist/compiled/webpack/webpack.js') as {
  sources: typeof import('webpack').sources;
  webpack: typeof import('webpack');
};

export interface SearchIndex {
  id: string;
  title: string;
  description?: string;
  url: string;
  structuredData: StructuredData;
}

export interface Options {
  /**
   * Only enable at production builds, default: `true`
   */
  productionOnly?: boolean;

  /**
   * Absolute path of root content directory
   */
  rootContentDir: string;

  /**
   * @param path - MDX file path relative to root content dir
   * @returns page URL
   */
  getUrl?: (path: string) => string;
}

export class SearchIndexPlugin {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const {
      rootContentDir,
      productionOnly = true,
      getUrl = (file) => {
        const parsedPath = path.parse(file);
        const flattenedPath = path.join(parsedPath.dir, parsedPath.name);

        return createGetUrl('/')(flattenedPath.split(path.sep));
      },
    } = this.options;
    const logger = compiler.getInfrastructureLogger(SearchIndexPlugin.name);
    const isProduction = process.env.NODE_ENV === 'production';

    if (productionOnly && !isProduction) return;

    compiler.hooks.compilation.tap(SearchIndexPlugin.name, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: SearchIndexPlugin.name,
          stage: pkg.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          const indexFiles: SearchIndex[] = [];

          for (const m of compilation.modules.values()) {
            if (!m.buildInfo || !('__fumadocs' in m.buildInfo)) continue;

            const searchData = m.buildInfo.__fumadocs as {
              path: string;
              data: {
                structuredData: StructuredData;
                frontmatter: {
                  title: string;
                  description?: string;
                };
              };
            };

            const relativePath = path.relative(rootContentDir, searchData.path);

            const data = searchData.data;
            indexFiles.push({
              id: searchData.path,
              structuredData: data.structuredData,
              title: data.frontmatter.title,
              description: data.frontmatter.description,
              url: getUrl(relativePath),
            });
          }

          compilation.emitAsset(
            'fumadocs_search.json',
            new pkg.sources.RawSource(JSON.stringify(indexFiles)),
          );

          logger.info('Generated Search Indexes');
        },
      );
    });
  }
}
