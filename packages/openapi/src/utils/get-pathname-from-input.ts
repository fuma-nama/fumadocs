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
    else if (typeof paramValue === 'number')
      pathname = pathname.replace(`{${key}}`, paramValue.toString());
  }

  const searchParams = new URLSearchParams();
  for (const key in query) {
    const paramValue = query[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      searchParams.append(key, paramValue);
    else if (typeof paramValue === 'number')
      searchParams.append(key, paramValue.toString());
  }

  return searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
}
