'use client';
import { wrapLazy } from '../../utils/lazy';

export const ApiProviderLazy = wrapLazy(() =>
  import('./api').then((mod) => ({ default: mod.ApiProvider })),
);

export const ServerProviderLazy = wrapLazy(() =>
  import('./api').then((mod) => ({ default: mod.ServerProvider })),
);
