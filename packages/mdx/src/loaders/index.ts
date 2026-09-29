// meta files opt into the loader via `?collection=` (config collections) or `?macro_id=` (macros)
export const metaLoaderGlob = /\.(json|yaml)\?.*(collection|macro_id)=/;
export const metaLoaderFileGlob = /\.(json|yaml)$/;
export const metaLoaderQueryGlob = /[?&](collection|macro_id)=/;
export const mdxLoaderGlob = /\.mdx?(\?.+?)?$/;
