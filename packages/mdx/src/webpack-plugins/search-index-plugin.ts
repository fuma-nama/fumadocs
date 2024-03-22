/* eslint-disable @typescript-eslint/consistent-type-imports -- Webpack */
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import { createGetUrl, getSlugs, parseFilePath } from 'fumadocs-core/source';
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
  rootContentDir: string;
  rootMapFile: string;

  /**
   * Only build search indexes in production builds
   *
   * @defaultValue true
   */
  productionOnly?: boolean;

  /**
   * @param path - MDX file path relative to root content dir
   * @returns page URL
   */
  getUrl?: (path: string) => string;

  /**
   * Filter MDX files with specific path
   *
   * @param path - MDX file path relative to root content dir
   * @returns whether should include this item in search indexes
   */
  filter?: (path: string) => boolean;
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
      filter = () => true,
      getUrl = (file) => {
        return createGetUrl('/')(getSlugs(parseFilePath(file)));
      },
    } = this.options;
    const logger = compiler.getInfrastructureLogger(SearchIndexPlugin.name);
    const isProduction = process.env.NODE_ENV === 'production';

    if (productionOnly && !isProduction) return;

    compiler.hooks.compilation.tap(SearchIndexPlugin.name, (compilation) => {
      if (compilation.name !== 'server') return;

      compilation.hooks.processAssets.tap(
        {
          name: SearchIndexPlugin.name,
          stage: pkg.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          const indexFiles = new Map<string, SearchIndex>();

          for (const m of compilation.modules.values()) {
            if (!m.buildInfo || !('__fumadocs' in m.buildInfo)) continue;

            const info = m.buildInfo.__fumadocs as {
              path: string;
              data: {
                structuredData: StructuredData;
                frontmatter: {
                  title: string;
                  description?: string;
                };
              };
            };

            const relativePath = path.relative(rootContentDir, info.path);

            if (!filter(relativePath)) continue;
            indexFiles.set(info.path, {
              id: info.path,
              structuredData: info.data.structuredData,
              title: info.data.frontmatter.title,
              description: info.data.frontmatter.description,
              url: getUrl(relativePath),
            });
          }

          compilation.emitAsset(
            'fumadocs_search.json',
            new pkg.sources.RawSource(
              JSON.stringify(Array.from(indexFiles.values())),
            ),
          );

          logger.info('Generated Search Indexes');
        },
      );
    });
  }
}
