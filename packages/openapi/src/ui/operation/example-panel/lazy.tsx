'use client';
import { wrapLazy } from '../../../utils/lazy';

export const APIExampleSelectorLazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.APIExampleSelector })),
);

export const APIExampleUsageTabLazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.APIExampleUsageTab })),
);
