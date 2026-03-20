import type { Component, Reference, SourceReference } from '@fumadocs/cli/build';
import { glob } from 'node:fs/promises';
import path from 'node:path';

/**
 * externalize some contexts & hooks
 */
export function resolveExternal(
  ref: SourceReference,
  toPackageName: string,
  toRegistryDir: string,
): Reference | undefined {
  if (ref.type === 'file') {
    const file = path.relative(toRegistryDir, ref.file).replaceAll(path.sep, '/');

    if (/^contexts\//.test(file) || /^utils\/use-/.test(file)) {
      return {
        dep: toPackageName,
        type: 'dependency',
        specifier: `${toPackageName}/${removeExtname(file)}`,
      };
    }
  }
}

export async function findSlotComponents(dir: string): Promise<Component[]> {
  const slots: Component[] = [];

  for await (const file of glob('layouts/**/slots/*', { cwd: dir })) {
    const relativePath = path.relative('layouts', file);
    const name = relativePath
      .split(path.sep)
      .filter((v) => v !== 'slots')
      .join('/')
      .slice(0, -path.extname(relativePath).length);

    slots.push({
      name: `slots/${name}`,
      unlisted: true,
      files: [
        {
          path: file,
          type: 'layout',
          target: path.join('<dir>', relativePath),
        },
      ],
    });
  }

  return slots;
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
