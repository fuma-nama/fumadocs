import { cache } from 'react';

export interface RevalidableConfig<Args extends unknown[], O> {
  /**
   * If specified, revalidate by stale time.
   */
  staleTime?: number;
  create: (...args: Args) => O;
}

export type WithRevalidate<Args extends unknown[], O> = {
  revalidate: (keepStale?: boolean) => void;
  (...args: Args): O;
};

export function revalidable<Args extends unknown[], O>(
  config: RevalidableConfig<Args, O>,
): WithRevalidate<Args, O> {
  const { create, staleTime } = config;

  if (typeof staleTime === 'number') {
    let lastValidated: number | null = null;
    let lastResult: O = undefined as O;
    let revalidating = false;

    const out: WithRevalidate<Args, O> = function (...args: Args) {
      if (lastValidated === null) {
        // init
        lastResult = create(...args);
        lastValidated = Date.now();
        return lastResult;
      }

      const isStale = Date.now() - lastValidated >= staleTime;
      if (!isStale || revalidating) return lastResult;

      revalidating = true;
      const next = create(...args);

      if (next instanceof Promise) {
        void next
          .then((res) => {
            lastResult = res;
            lastValidated = Date.now();
          })
          .finally(() => {
            revalidating = false;
          });
      } else {
        lastResult = next;
        lastValidated = Date.now();
      }

      return lastResult;
    };

    out.revalidate = (keepStale = true) => {
      lastValidated = keepStale ? 0 : null;
    };
  }

  const out = cache(create) as WithRevalidate<Args, O>;
  out.revalidate = () => {
    return;
  };
  return out;
}
