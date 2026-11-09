export function normalize(urlOrPath: string) {
  if (urlOrPath.length > 1 && urlOrPath.endsWith('/')) return urlOrPath.slice(0, -1);
  return urlOrPath;
}

/**
 * @returns if `href` is matching the given pathname
 */
export function isActive(href: string, pathname: string, nested = false): boolean {
  href = normalize(href);
  pathname = normalize(pathname);

  return href === pathname || (nested && pathname.startsWith(`${href}/`));
}

/** the URL hash without `#`, decoded like the browser does to find its target */
export function getHash(): string {
  const hash = window.location.hash.slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}
