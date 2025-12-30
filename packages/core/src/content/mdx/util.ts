import type { Pluggable } from 'unified';

type Thenable<T> = T | PromiseLike<T>;

export type ResolvePlugins = Thenable<Pluggable>[] | ((v: Pluggable[]) => Thenable<Pluggable>[]);

export async function resolvePlugins(
  def: (v: Thenable<Pluggable>[]) => Thenable<Pluggable | false>[],
  options: ResolvePlugins = [],
): Promise<Pluggable[]> {
  const list = (await Promise.all(def(Array.isArray(options) ? options : []))).filter(
    (v) => v !== false,
  );

  if (typeof options === 'function') {
    return Promise.all(options(list));
  }

  return list;
}
