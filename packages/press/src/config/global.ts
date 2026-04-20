import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import z from 'zod';
import type { ChokidarOptions } from 'chokidar';
import type { LanguageModel } from 'ai';

type Awaitable<T> = T | Promise<T>;

export const layoutConfigSchema = z.object({
  /**
   * the shared options for layouts.
   */
  base: z
    .custom<() => Awaitable<BaseLayoutProps>>()
    .refine((v) => typeof v === 'function')
    .or(z.custom<BaseLayoutProps>().refine((v) => typeof v === 'object' && v !== null))
    .optional(),

  presets: z
    .object({
      /**
       * layout preset for Markdown files.
       */
      md: z.literal(['docs', 'flux']).optional(),
    })
    .optional(),
});

export const projectConfigSchema = z.object({
  /**
   * project name.
   */
  name: z.string(),
  /**
   * root directory for content files.
   */
  dir: z.string(),
  /**
   * a list of glob patterns, customize the content files to be scanned.
   */
  include: z.array(z.string()).optional(),
  /**
   * directory to the static assets
   */
  assetsDir: z.array(z.string()).optional(),
  /**
   * customize chokidar, by default, file watcher will watch all files under the `dir` directory.
   */
  watchOptions: z.custom<(options: ChokidarOptions) => ChokidarOptions>().optional(),
});

export const contentConfigSchema = z.object({
  /**
   * a list of project configurations.
   */
  projects: z.array(projectConfigSchema).optional(),
});

export const aiConfigSchema = z.object({
  /**
   * a function to create model interface for AI SDK
   */
  createModel: z.custom<() => Awaitable<LanguageModel>>((t) => typeof t === 'function').optional(),
});

export const configSchema = z.object({
  layout: layoutConfigSchema.optional(),
  content: contentConfigSchema.optional(),
  ai: aiConfigSchema.optional(),
});

export type LayoutConfig = z.infer<typeof layoutConfigSchema>;
export type ContentConfig = z.infer<typeof contentConfigSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type FumapressConfig = z.infer<typeof configSchema>;

export function defineConfig(config: FumapressConfig = {}): FumapressConfig {
  return config;
}
