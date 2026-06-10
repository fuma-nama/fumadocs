export function joinURL(base: string, pathname: string): string {
  if (pathname.startsWith('/')) pathname = pathname.slice(1);
  if (base.endsWith('/')) base = base.slice(0, -1);

  if (pathname.length > 0) return base + '/' + pathname;
  else return base;
}

export function resolveServerUrl(template: string, variables: Record<string, string>): string {
  for (const [key, value] of Object.entries(variables)) {
    template = template.replaceAll(`{${key}}`, value);
  }

  return template;
}
