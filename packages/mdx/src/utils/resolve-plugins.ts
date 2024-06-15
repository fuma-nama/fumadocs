import type { Pluggable } from 'unified';
import type {
  LazyPluginResolution,
  ResolvePlugins,
  ResolvePluginsInput,
} from '@/loader-mdx';

export async function getPlugins(
  def: (v: Pluggable[]) => (Pluggable | false)[],
  options: ResolvePluginsInput = [],
): Promise<Pluggable[]> {
  const plugins = await resolveImportPlugins(options);

  const list = def(Array.isArray(plugins) ? plugins : []).filter(
    Boolean,
  ) as Pluggable[];

  if (typeof plugins === 'function') {
    return plugins(list);
  }

  return list;
}

/**
 * When building with turbo we cannot pass closures across the nextjs → turbo boundary,
 * so instead we support the syntax from {@link LazyPluginResolution} which this function
 * then evaluates returning a fully resolved plugin
 */
async function resolveImportPlugins(
  input: ResolvePluginsInput,
): Promise<ResolvePlugins> {
  if (Array.isArray(input)) {
    return await Promise.all(
      input.map(async (v) => {
        if (isLazyPluginResolution(v)) {
          const [pluginName, options] = v;
          const plugin = (
            (await import(pluginName)) as {
              default: (options?: object) => Pluggable;
            }
          ).default;
          return (() => plugin(options)) as Pluggable;
        }
        return v;
      }),
    );
  }

  return input;
}

function isLazyPluginResolution(v: unknown): v is LazyPluginResolution {
  return Array.isArray(v) && typeof v[0] === 'string';
}
