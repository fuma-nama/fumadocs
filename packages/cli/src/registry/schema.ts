import { z } from 'zod';

export type NamespaceType = (typeof namespaces)[number];
export type CompiledFile = z.input<typeof fileSchema>;
export type CompiledComponent = z.input<typeof componentSchema>;
export type CompiledRegistryInfo = z.input<typeof registryInfoSchema>;
export type DownloadedRegistryInfo = z.output<typeof registryInfoSchema>;
export type File = z.output<typeof fileSchema>;
export type Component = z.output<typeof componentSchema>;

export const namespaces = ['components', 'lib', 'css', 'route', 'ui', 'block'] as const;

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

export const httpSubComponent = z.object({
  type: z.literal('http'),
  baseUrl: z.string(),
  component: z.string(),
});

export const componentSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  files: z.array(fileSchema),
  dependencies: z.record(z.string(), z.string().or(z.null())),
  devDependencies: z.record(z.string(), z.string().or(z.null())),
  /**
   * list of sub components, either local (component name) or remote (registry info & component name)
   */
  subComponents: z.array(z.string().or(httpSubComponent)).default([]),
});

export const registryInfoSchema = z.object({
  /**
   * define used variables, variables can be referenced in the import specifiers of component files.
   */
  variables: z
    .record(
      z.string(),
      z.object({
        description: z.string().optional(),
        default: z.unknown().optional(),
      }),
    )
    .optional(),
  /**
   * provide variables to sub components
   */
  env: z.record(z.string(), z.unknown()).optional(),
  indexes: z.array(indexSchema).default([]),

  registries: z.array(z.string()).optional(),
});
