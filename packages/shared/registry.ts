import type { Component, Reference, SourceReference } from '@fumadocs/cli/build';
import path from 'node:path';

/**
 * externalize some contexts & hooks
 */
export function resolveExternal(
  ref: SourceReference,
  toPackageName: string,
  toRegistryDir: string,
): Reference | undefined {
  if (ref.type !== 'file') return;

  const file = path.relative(toRegistryDir, ref.file);
  if (file.startsWith('contexts/') || /^utils\/use-/.test(file)) {
    return {
      dep: toPackageName,
      type: 'dependency',
      specifier: `${toPackageName}/${removeExtname(file)}`,
    };
  }
}

export const commonComponents: Component[] = [
  {
    name: 'urls',
    unlisted: true,
    files: [
      {
        type: 'lib',
        path: 'utils/urls.ts',
      },
    ],
  },
  {
    name: 'cn',
    unlisted: true,
    files: [
      {
        type: 'lib',
        path: 'utils/cn.ts',
      },
    ],
  },
  {
    name: 'merge-refs',
    unlisted: true,
    files: [
      {
        type: 'lib',
        path: 'utils/merge-refs.ts',
      },
    ],
  },
  {
    name: 'link-item',
    unlisted: true,
    files: [
      {
        type: 'components',
        path: 'utils/link-item.tsx',
        target: '<dir>/layout/link-item.tsx',
      },
    ],
  },
  {
    name: 'toc',
    unlisted: true,
    files: [
      {
        type: 'components',
        path: 'components/toc/clerk.tsx',
        target: '<dir>/toc/clerk.tsx',
      },
      {
        type: 'components',
        path: 'components/toc/default.tsx',
        target: '<dir>/toc/default.tsx',
      },
      {
        type: 'components',
        path: 'components/toc/index.tsx',
        target: '<dir>/toc/index.tsx',
      },
    ],
  },
];

function removeExtname(file: string) {
  return file.slice(0, -path.extname(file).length);
}
