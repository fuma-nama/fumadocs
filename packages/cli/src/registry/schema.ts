import { z } from 'zod';

export type NamespaceType = (typeof namespaces)[number];
export type CompiledFile = z.input<typeof fileSchema>;
export type CompiledComponent = z.input<typeof componentSchema>;
export type CompiledRegistryInfo = z.input<typeof registryInfoSchema>;
export type File = z.output<typeof fileSchema>;
export type Component = z.output<typeof componentSchema>;

export const namespaces = [
  'components',
  'lib',
  'css',
  'route',
  'ui',
  'block',
] as const;

export const indexSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const fileSchema = z.object({
  type: z.literal(namespaces),
  path: z.string(),
  target: z.string().optional(),
  content: z.string(),
});

export const componentSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  files: z.array(fileSchema),
  dependencies: z.record(z.string(), z.string().or(z.null())),
  devDependencies: z.record(z.string(), z.string().or(z.null())),
  subComponents: z.array(z.string()).default([]),
});

export const switchableEntitySchema = z.object({
  /**
   * map specifier string
   */
  specifier: z.string(),

  /**
   * map names of exported members
   */
  members: z.record(z.string(), z.string()),
});

export const registryInfoSchema = z.object({
  switchables: z.record(z.string(), switchableEntitySchema).optional(),
  indexes: z.array(indexSchema),
});
