import { afterEach, expect, test, vi } from 'vitest';
import * as radix from '../src/utils/urls';
import * as base from '../../base-ui/src/utils/urls';

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each([
  ['Radix UI', radix.getHash],
  ['Base UI', base.getHash],
] as const)('%s: getHash decodes the URL hash', (_, getHash) => {
  const cases: [string, string][] = [
    ['', ''],
    ['#tab-rust', 'tab-rust'],
    ['#%E6%A0%87%E7%AD%BE-cpp', '标签-cpp'],
    ['#caf%C3%A9', 'café'],
    // malformed escape, kept as-is
    ['#100%', '100%'],
  ];

  for (const [hash, expected] of cases) {
    vi.stubGlobal('window', { location: { hash } });
    expect(getHash()).toBe(expected);
  }
});
