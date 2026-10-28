declare module 'virtual:fumadocs/mdx-components' {
  const components: Record<string, unknown>;
  export default components;
}

declare module 'virtual:fumadocs/config' {
  /** the `dir` option */
  export const dir: string;
}
