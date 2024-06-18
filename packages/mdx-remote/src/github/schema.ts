import { z, type ZodError } from 'zod';

class DataError extends Error {
  constructor(name: string, error: ZodError) {
    const info = error.flatten();

    super(
      `${name}: ${JSON.stringify(
        {
          root: info.formErrors,
          ...info.fieldErrors,
        },
        null,
        2,
      )}`,
    );
    this.name = 'DataError';
  }
}

export function parse<T extends typeof githubCacheFileSchema>(
  schema: T,
  object: unknown,
  errorName: string,
): z.infer<T> {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new DataError(errorName, result.error);
  }

  return result.data;
}

const baseSubDirectorySchema = z.object({
  path: z.string(),
  sha: z.string(),
  files: z
    .object({
      path: z.string(),
      sha: z.string(),
      content: z.promise(z.string()).or(z.string()).optional(),
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
