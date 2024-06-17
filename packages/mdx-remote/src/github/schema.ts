import { z } from 'zod';

const baseSubDirectorySchema = z.object({
  path: z.string(),
  sha: z.string(),
  files: z
    .object({
      path: z.string(),
      sha: z.string(),
      content: z.string(),
    })
    .array(),
});

type SubDirectory = z.infer<typeof baseSubDirectorySchema> & {
  subDirectories: SubDirectory[];
};

const subDirectorySchema: z.ZodType<SubDirectory> =
  baseSubDirectorySchema.extend({
    subDirectories: z.lazy(() => subDirectorySchema.array()),
  });

export const githubCacheFileSchema: z.ZodType<
  Omit<SubDirectory, 'path'> & {
    lastUpdated: number;
  }
> = baseSubDirectorySchema
  .omit({
    path: true,
  })
  .extend({
    lastUpdated: z.number(),
    subDirectories: z.lazy(() => subDirectorySchema.array()),
  });
