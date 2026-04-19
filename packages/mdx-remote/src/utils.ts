import type { Pluggable } from 'unified';
import { frontmatter as matter } from 'fumadocs-core/content/md/frontmatter';

export type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export function pluginOption(
  def: (v: Pluggable[]) => (Pluggable | false | null)[],
  options: ResolvePlugins = [],
): Pluggable[] {
  const list = def(Array.isArray(options) ? options : []).filter(Boolean) as Pluggable[];

  if (typeof options === 'function') {
    return options(list);
  }

  return list;
}

export function parseFrontmatter(content: string) {
  const out = matter(content);

  return {
    frontmatter: out.data,
    content: out.content,
  };
}
