import type { Params } from './source';

const segmentRegex = /^\[([^\]/]+)\]/;

/** the names of the params in a path, like `framework` in `[framework]/docs` */
export function segmentNames(path: string): string[] {
  const names: string[] = [];
  for (const seg of path.split('/')) {
    const match = segmentRegex.exec(seg);
    if (match) names.push(match[1]);
  }
  return names;
}

/** whether a path has dynamic segments, like `[framework]/deploy.mdx` */
export function isDynamicPath(path: string): boolean {
  return path.includes('[') && path.split('/').some((seg) => segmentRegex.test(seg));
}

export interface StaticParamsOptions {
  /** the `staticParams` of the file itself, like in its frontmatter */
  staticParams?: Params[];
  /**
   * Read the `staticParams` of a meta file in the storage, by its path without the extension, like
   * `[framework]/meta`. `undefined` when the file doesn't exist or lists none.
   */
  readStaticParams: (path: string) => Params[] | undefined;
}

/**
 * The params of each page that a file of a dynamic path makes, like `[framework]/deploy.mdx`: its own
 * `staticParams`, combined with those of the meta files in its folders by the names they share. `undefined` when the
 * path isn't dynamic or nothing lists them, the file is then a page at its literal path.
 *
 * The meta files of a language come first, like `meta.cn.json` for `deploy.cn.mdx`.
 *
 * @param file - the path of the file, relative to the content directory
 */
export function getStaticParams(
  file: string,
  { staticParams, readStaticParams }: StaticParamsOptions,
): Params[] | undefined {
  if (!file.includes('[')) return;
  const names = segmentNames(file);
  if (names.length === 0) return;
  const segments = file.split('/');
  const parts = segments.pop()!.split('.');
  const metaNames = parts.length > 2 ? [`meta.${parts.at(-2)}`, 'meta'] : ['meta'];

  let combinations: Params[] = [{}];
  let listed = false;
  const join = (list: Params[] | undefined) => {
    if (!list?.some((entry) => names.some((name) => Object.hasOwn(entry, name)))) return;
    listed = true;
    const next: Params[] = [];
    for (const combination of combinations)
      for (const entry of list) {
        let agrees = true;
        for (const k in entry)
          if (Object.hasOwn(combination, k) && combination[k] !== entry[k]) {
            agrees = false;
            break;
          }
        if (agrees) next.push({ ...combination, ...entry });
      }
    combinations = next;
  };

  const readFolder = (folder: string) => {
    for (const name of metaNames) {
      const list = readStaticParams(folder ? `${folder}/${name}` : name);
      if (list) return join(list);
    }
  };
  let folder = '';
  readFolder(folder);
  for (const seg of segments) readFolder((folder = folder ? `${folder}/${seg}` : seg));
  join(staticParams);
  if (!listed) return;

  // by the values of its segments, other names in a list don't make another page
  const out = new Map<string, Params>();
  for (const combination of combinations) {
    const entries: [string, string][] = [];
    for (const name of names) {
      if (!Object.hasOwn(combination, name))
        throw new Error(`No value of "[${name}]" is listed for "${file}"`);
      entries.push([name, combination[name]]);
    }
    // own keys, even `__proto__`
    const params: Params = Object.fromEntries(entries);
    out.set(JSON.stringify(params), params);
  }
  return [...out.values()];
}

/** @internal */
export function fillParams(file: string, params: Params): string {
  let out = '';
  for (const seg of file.split('/')) {
    const match = segmentRegex.exec(seg);
    const value =
      match && Object.hasOwn(params, match[1])
        ? params[match[1]] + seg.slice(match[0].length)
        : seg;
    out = out ? `${out}/${value}` : value;
  }
  return out;
}
