import type { FC, HTMLAttributes } from 'react';
import serverComponents from '@/internal/mdx-server';

const { Pre } = await import('@/internal/mdx-client');

const defaultMdxComponents = {
  pre: (p: HTMLAttributes<HTMLPreElement>) => <Pre {...p} />,
  ...serverComponents,
};

/**
 * Sometimes, if you directly pass a client component to MDX Components, it will throw an error
 *
 * To solve this, you can re-create the component in a server component like: `(props) => <Component {...props} />`
 *
 * This function does that for you
 *
 * @param c - MDX Components
 * @returns MDX Components with re-created client components
 */
export function createComponents<
  Components extends Record<string, FC<unknown>>,
>(c: Components): Components {
  const mapped = Object.entries(c).map(([k, V]) => {
    // Client components are empty objects
    return [
      k,
      Object.keys(V).length === 0 ? (props: object) => <V {...props} /> : V,
    ];
  });

  return Object.fromEntries(mapped) as Components;
}

export { defaultMdxComponents as default };
