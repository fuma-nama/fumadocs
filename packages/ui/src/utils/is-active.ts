function normalize(url: string) {
  if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
  return url;
}

export function isActive(
  url: string,
  pathname: string,
  nested = true,
): boolean {
  url = normalize(url);
  pathname = normalize(pathname);

  return url === pathname || (nested && pathname.startsWith(`${url}/`));
}
