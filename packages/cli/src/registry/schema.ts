import { z } from 'zod';

export interface RawRegistry {
  name: string;
  index: z.input<typeof indexSchema>[];
  components: z.input<typeof componentSchema>[];
}

export type NamespaceType = (typeof namespaces)[number];
export type FileInput = z.input<typeof fileSchema>;
export type FileOutput = z.output<typeof fileSchema>;
export type ComponentInput = z.input<typeof componentSchema>;
export type ComponentOutput = z.infer<typeof componentSchema>;

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
