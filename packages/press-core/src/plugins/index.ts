import type { AppContext } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import type { createPages } from 'waku';

export interface ServerPlugin {
  /** receive & modify context */
  init?: (this: AppContext) => void;

  createPages?: (
    this: AppContext,
    fns: Parameters<Parameters<typeof createPages>[0]>[0],
  ) => Awaitable<void>;
}
