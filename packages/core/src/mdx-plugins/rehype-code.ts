import { defaultShikiFactory, wasmShikiFactory } from '@/highlight/shiki/full';
import * as base from './rehype-code.core';
import type { HighlighterCore } from 'shiki';

export type RehypeCodeOptions = base.RehypeCodeOptionsCommon & {
  /**
   * The regex engine to use.
   *
   * @defaultValue 'js'
   */
  engine?: 'js' | 'oniguruma';
};

export const rehypeCodeDefaultOptions: RehypeCodeOptions = {
  engine: 'js',
  ...base.rehypeCodeDefaultOptions(),
};

export const rehypeCode = base.createRehypeCode<Partial<RehypeCodeOptions>>(async (_options) => {
  const options: RehypeCodeOptions = {
    ...rehypeCodeDefaultOptions,
    ..._options,
  };
  const factory = options.engine === 'oniguruma' ? wasmShikiFactory : defaultShikiFactory;
  let highlighter: HighlighterCore;
  if (options.langAlias) {
    // TODO: When newer Shiki supported it, register lang alias dynamically instead of creating new instance
    highlighter = await factory.init({ langAlias: options.langAlias });
  } else {
    highlighter = await factory.getOrInit();
  }

  return { highlighter, options };
});

export { transformerIcon, transformerTab, type CodeBlockIcon } from './rehype-code.core';
