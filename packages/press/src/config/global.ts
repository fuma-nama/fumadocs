import { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import z from 'zod';

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
   * a list of glob patterns, customise the content files to be scanned.
   */
  include: z.array(z.string()).optional(),
});

export const contentConfigSchema = z.object({
  /**
   * a list of project configurations.
   */
  projects: z.array(projectConfigSchema).optional(),
});

export const configSchema = z.object({
  layout: layoutConfigSchema.optional(),
  content: contentConfigSchema.optional(),
});

export type LayoutConfig = z.infer<typeof layoutConfigSchema>;
export type ContentConfig = z.infer<typeof contentConfigSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type FumapressConfig = z.infer<typeof configSchema>;

export function defineConfig(config: FumapressConfig = {}): FumapressConfig {
  return config;
}
