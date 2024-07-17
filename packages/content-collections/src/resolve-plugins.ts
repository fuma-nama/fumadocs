import type { Pluggable, Plugin } from 'unified';

export type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export function resolvePlugins(
  def: (v: Pluggable[]) => (Pluggable | false)[],
  options: ResolvePlugins = [],
): Pluggable[] {
  const list = def(Array.isArray(options) ? options : []).filter(
    Boolean,
  ) as Pluggable[];

  if (typeof options === 'function') {
    return options(list);
  }

  return list;
}

export function resolvePlugin<Param>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config type
  plugin: Plugin<[Param], any, any>,
  options: Param | boolean,
): Pluggable | false {
  if (typeof options === 'boolean') return options ? plugin : false;

  return [plugin, options];
}
