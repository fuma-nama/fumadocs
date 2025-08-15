import { z } from 'zod';

export type Output = z.infer<typeof rootSchema>;
export type NamespaceType = (typeof namespaces)[number];
export type OutputIndex = z.infer<typeof indexSchema>;
export type OutputFile = z.infer<typeof fileSchema>;
export type OutputComponent = z.infer<typeof componentSchema>;

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

export const rootSchema = z.object({
  name: z.string(),
  index: z.array(indexSchema),
  components: z.array(componentSchema),
});
