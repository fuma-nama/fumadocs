/** the key in `remarkPluginFrontmatter` holding the key of the page in `pageOutputs` of the runtime */
export const dataKey = '_fumadocs';

/** the query of the module of the frontmatter in code of an MDX file, TypeScript like the ESM of MDX */
export const frontmatterQuery = '?fumadocs-frontmatter&lang.ts';

/** whether an MDX file has frontmatter in code, `export const frontmatter = {...}` */
export function hasFrontmatterCode(source: string): boolean {
  return /^export const frontmatter\b/m.test(source);
}
