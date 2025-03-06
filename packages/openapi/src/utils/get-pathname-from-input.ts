export function getPathnameFromInput(
  url: string,
  path: Record<string, unknown>,
  query: Record<string, unknown>,
): string {
  let pathname = url;
  for (const key in path) {
    const paramValue = path[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      pathname = pathname.replace(`{${key}}`, paramValue);
  }

  const searchParams = new URLSearchParams();
  for (const key in query) {
    const paramValue = query[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      searchParams.append(key, paramValue);
  }

  return searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
}
