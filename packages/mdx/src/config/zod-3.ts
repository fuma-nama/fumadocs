// for backward compatibility
// while Fumadocs expose Zod v4 schemas, some Zod v3 users use `.extend()` on schemas
// we can expose v3 schema instead
import { z } from 'zod/v3';

export const metaSchema = z.object({
  title: z.string().optional(),
  pages: z.array(z.string()).optional(),
  description: z.string().optional(),
  root: z.boolean().optional(),
  defaultOpen: z.boolean().optional(),
  icon: z.string().optional(),
});

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  full: z.boolean().optional(),

  // Fumadocs OpenAPI generated
  _openapi: z.object({}).passthrough().optional(),
});

export * from './define';
export {
  getDefaultMDXOptions,
  type DefaultMDXOptions,
} from '../utils/mdx-options';
export * from '../mdx-plugins/remark-include';
