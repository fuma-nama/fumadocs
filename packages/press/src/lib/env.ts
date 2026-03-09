import { z } from 'zod/mini';

const stringArraySchema = z.array(z.string());

export function getDefaultProjectDirectories(): string[] {
  const v = process.env.DEFAULT_RPOJECT_DIR;

  if (v) {
    const parsed = stringArraySchema.safeParse(JSON.parse(v));
    if (parsed.success) return parsed.data;
  }

  return [process.env.ROOT_DIR ?? process.cwd()];
}
