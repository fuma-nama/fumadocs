import * as base from './rehype-code.min';
import { withJSEngine, withWASMEngine } from '@/highlight/full/config';

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
  ...base.rehypeCodeDefaultOptions(withJSEngine),
};

export const rehypeCode = base.createRehypeCode<Partial<RehypeCodeOptions>>((_options) => {
  const options: RehypeCodeOptions = {
    ...rehypeCodeDefaultOptions,
    ..._options,
  };
  if (options.engine === 'oniguruma') return { config: withWASMEngine, options };
  return { config: withJSEngine, options };
});

export { transformerIcon, transformerTab, type CodeBlockIcon } from './rehype-code.min';
