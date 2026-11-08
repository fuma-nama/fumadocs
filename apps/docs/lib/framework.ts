/** the frameworks of the docs, values of the `[framework]` path param */
export const frameworks = [
  { value: 'next', name: 'Next.js' },
  { value: 'react-router', name: 'React Router' },
  { value: 'tanstack-start', name: 'TanStack Start' },
  { value: 'waku', name: 'Waku' },
  { value: 'astro', name: 'Astro' },
] as const;

export type Framework = (typeof frameworks)[number]['value'];

export const defaultFramework: Framework = 'next';

export function isFramework(value: unknown): value is Framework {
  return frameworks.some((item) => item.value === value);
}

/**
 * Pages of the `[framework]` folder have a framework segment, like `/docs/next/search`. Links in content omit it
 * (`/docs/search`), they resolve to the framework of the page, or the default framework.
 */
export function withFramework(url: string, framework: Framework): string | undefined {
  const match = /^\/docs(?=\/|$)/.exec(url);
  if (match) return `/docs/${framework}${url.slice(match[0].length)}`;
}
