export function getDefaultProjectDirectories(): string[] {
  const v = process.env.DEFAULT_RPOJECT_DIR;
  if (!v) return [];

  return JSON.parse(v) as string[];
}
