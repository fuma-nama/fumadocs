'use client';
import { wrapLazy } from '../../../utils/lazy';

export const UsageTabsSelectorLazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.UsageTabsSelector })),
);

export const UsageTabLazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.UsageTab })),
);

export const UsageTabsProviderLazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.UsageTabsProvider })),
);
