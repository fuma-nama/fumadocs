'use client';
import * as base from 'fumadocs-core/highlight/core/client';
import { withJSEngine } from 'fumadocs-core/highlight/full/config';
import type { ReactNode } from 'react';

export function ShikiConfigProvider({ children }: { children: ReactNode }) {
  const config = base.useShikiConfigOptional() ?? withJSEngine;
  return <base.ShikiConfigProvider config={config}>{children}</base.ShikiConfigProvider>;
}
