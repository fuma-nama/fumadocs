'use client';
import { wrapLazy } from '../../utils/lazy';

export const SchemaUILazy = wrapLazy(() =>
  import('./client').then((mod) => ({ default: mod.SchemaUI })),
);
