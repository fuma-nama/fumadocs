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

/** the name of a framework, like `Next.js` */
export function frameworkName(value: string): string | undefined {
  return frameworks.find((item) => item.value === value)?.name;
}

export function isFramework(value: unknown): value is Framework {
  return frameworks.some((item) => item.value === value);
}
