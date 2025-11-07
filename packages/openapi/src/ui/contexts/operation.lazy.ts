'use client';
import { wrapLazy } from '../../utils/lazy';

export const OperationProviderLazy = wrapLazy(() =>
  import('./operation').then((mod) => ({ default: mod.OperationProvider })),
);
