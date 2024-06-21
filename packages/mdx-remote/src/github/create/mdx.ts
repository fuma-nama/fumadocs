import { compile } from '@/index';
import type { Options } from '../..';

export const createCompileMDX =
  (additionalOptions?: Pick<Options, 'mdxOptions' | 'components'>) =>
  async (
    source: string,
    options?: Pick<Options, 'mdxOptions' | 'components'>,
  ) => {
    return compile(
      Object.assign(additionalOptions ?? {}, {
        ...options,
        source,
      }),
    );
  };
