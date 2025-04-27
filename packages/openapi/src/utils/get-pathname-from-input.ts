export function getPathnameFromInput(
  url: string,
  path: Record<string, unknown>,
  query: Record<string, unknown>,
): string {
  let pathname = url;
  for (const key in path) {
    if (path[key] === '') continue;

    if (Array.isArray(path[key])) {
      pathname = pathname.replace(`{${key}}`, path[key].join('/'));
    } else {
      pathname = pathname.replace(`{${key}}`, String(path[key]));
    }
  }

  const searchParams = new URLSearchParams();
  for (const key in query) {
    if (query[key] === '') continue;

    if (Array.isArray(query[key])) {
      for (const value of query[key]) {
        searchParams.append(key, String(value));
      }
    } else {
      searchParams.set(key, String(query[key]));
    }
  }

  return searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
}
