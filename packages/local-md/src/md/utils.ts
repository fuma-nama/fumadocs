import type { Pluggable, Plugin } from 'unified';

export function plugin<
  PluginParameters extends unknown[],
  Input extends string | import('unist').Node | undefined,
  Output,
>(plugin: Plugin<PluginParameters, Input, Output>, ...params: NoInfer<PluginParameters>) {
  return [plugin, ...params] as Pluggable;
}

export function plugins(...plugins: (Pluggable | false | null | undefined)[]): Pluggable[] {
  return plugins.filter((v) => v !== false && v != null);
}
