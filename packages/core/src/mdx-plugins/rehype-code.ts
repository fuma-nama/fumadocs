import * as base from './rehype-code.core';
import { configDefault, configWASM } from '@/highlight';

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
  ...base.rehypeCodeDefaultOptions(configDefault),
};

export const rehypeCode = base.createRehypeCode<Partial<RehypeCodeOptions>>((_options) => {
  const options: RehypeCodeOptions = {
    ...rehypeCodeDefaultOptions,
    ..._options,
  };
  if (options.engine === 'oniguruma') return { config: configWASM, options };
  return { config: configDefault, options };
});

export { transformerIcon, transformerTab, type CodeBlockIcon } from './rehype-code.core';
