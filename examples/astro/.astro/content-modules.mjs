export default new Map([
  [
    'content/docs/test.mdx',
    () =>
      import('astro:content-layer-deferred-module?astro%3Acontent-layer-deferred-module=&fileName=content%2Fdocs%2Ftest.mdx&astroContentModuleFlag=true'),
  ],
  [
    'content/docs/index.mdx',
    () =>
      import('astro:content-layer-deferred-module?astro%3Acontent-layer-deferred-module=&fileName=content%2Fdocs%2Findex.mdx&astroContentModuleFlag=true'),
  ],
]);
