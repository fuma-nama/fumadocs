export function getUrl(url: string, variables: Record<string, string>): string {
  let out = url;

  for (const [key, value] of Object.entries(variables)) {
    out = out.replaceAll(`{${key}}`, value);
  }

  return out;
}
