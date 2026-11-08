// meta files opt into the loader via `?collection=` (config collections) or `?macro_id=` (macros), those in code are
// named like `meta.ts` or `meta.cn.ts` so other modules with the query, like compiled MDX, aren't
export const metaLoaderGlob = /(\.(json|yaml)|\/meta(\.[\w-]+)?\.[jt]s)\?.*(collection|macro_id)=/;
export const metaLoaderFileGlob = /(\.(json|yaml)|\/meta(\.[\w-]+)?\.[jt]s)$/;
export const metaLoaderQueryGlob = /[?&](collection|macro_id)=/;
export const mdxLoaderGlob = /\.mdx?(\?.+?)?$/;
