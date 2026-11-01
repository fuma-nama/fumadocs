declare module 'virtual:fumadocs/config' {
  /** the options of collections, for their loaders */
  export const loaders: Record<string, { dir: string; extractLinkReferences?: boolean }>;
  /** the root directory of the project */
  export const root: string;
  export const srcDir: string;
  export const publicDir: string;
  /** has an adapter, routes can render on request */
  export const server: boolean;
  /** `output: 'server'`, pages render on request */
  export const onDemand: boolean;
}

/** the default export of the `components` module */
declare module 'virtual:fumadocs/components' {
  // oxlint-disable-next-line typescript/no-explicit-any -- each component has its props, like `MDXComponents`
  export const components: Record<string, import('react').FC<any>>;
}

/** the content island of React bodies */
declare module 'virtual:fumadocs/island' {
  export const FumadocsIsland: import('react').ComponentType<
    import('./island').FumadocsIslandProps
  >;
}

declare module 'virtual:fumadocs/app' {
  const config: import('./app').FumadocsConfig;
  export default config;
}

/** exports of the `layout` module */
declare module 'virtual:fumadocs/layout' {
  export const baseOptions:
    | ((locale?: string) => import('fumadocs-ui/layouts/shared').BaseLayoutProps)
    | undefined;
  /** wraps the children of the root provider in layouts */
  export const Provider:
    | import('react').ComponentType<{ children: import('react').ReactNode }>
    | undefined;
  export const SearchDialog:
    | import('react').ComponentType<import('fumadocs-ui/components/dialog/search').SharedProps>
    | undefined;
  export const useSearch:
    | ((options: { locale?: string }) => import('fumadocs-core/search/client').UseSearchReturn)
    | undefined;
}

/** the default export of the `page` module */
declare module 'virtual:fumadocs/page' {
  const Page: import('react').ComponentType<import('./app').DocsPageProps> | undefined;
  export default Page;
}

declare module 'virtual:fumadocs/css' {}

declare module '*.astro' {
  const component: import('./app').AstroComponent;
  export default component;
}
