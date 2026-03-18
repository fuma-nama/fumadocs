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
  // TODO: this will cause the installed slots to reference `fumadocs-ui` even if the layout & context itself are already installed locally.
  // need change from CLI side.
  if (ref.type === 'sub-component' && ref.resolved.type === 'local') {
    let specifier: string | undefined;
    switch (ref.resolved.component.name) {
      case 'layouts/home':
        specifier = '/layouts/home';
        break;
      case 'layouts/docs':
        specifier = ref.resolved.file.path.includes('page')
          ? '/layouts/docs/page'
          : '/layouts/docs';
        break;
      case 'layouts/notebook':
        specifier = ref.resolved.file.path.includes('page')
          ? '/layouts/notebook/page'
          : '/layouts/notebook';
        break;
      case 'layouts/flux':
        specifier = ref.resolved.file.path.includes('page')
          ? '/layouts/flux/page'
          : '/layouts/flux';
        break;
      case 'layouts/shared':
        specifier = '/layouts/shared';
        break;
    }

    if (specifier)
      return {
        type: 'dependency',
        dep: toPackageName,
        specifier: toPackageName + specifier,
      };
  }

  if (ref.type === 'file') {
    const file = path.relative(toRegistryDir, ref.file).replaceAll(path.sep, '/');

    if (file === 'utils/renderer.ts' || /^contexts\//.test(file) || /^utils\/use-/.test(file)) {
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

  for await (const file of glob('**/slots/*.tsx', { cwd: dir })) {
    const name = path.relative('layouts', file);
    if (name.startsWith('..')) continue;
    slots.push({
      name: name.slice(0, -path.extname(name).length),
      unlisted: true,
      files: [
        {
          path: file,
          type: 'components',
          target: path.join('<dir>/layout', file),
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
