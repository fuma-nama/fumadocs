import { z } from 'zod';

export const frontmatterSchema = z
  .object({
    aliases: z.array(z.string()).optional(),
  })
  .loose()
  .optional();

export type Frontmatter = z.input<typeof frontmatterSchema>;
