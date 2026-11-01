declare module 'virtual:fumadocs/config' {
  /** the content directories of collections */
  export const dirs: Record<string, string>;
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
