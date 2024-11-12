export function getFileNamespace(file: string): {
  namespace?: string;
  path: string;
} {
  const parsed = file.split(':', 2);

  if (parsed.length > 1) return { namespace: parsed[0], path: parsed[1] };
  return { path: file };
}
