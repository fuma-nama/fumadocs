import * as fs from 'node:fs/promises';
import { collapse } from './type-tree/builder';
import { cached, type Cache } from './cache';
import type { TypeNode } from './type-tree/types';
import type { ComponentPropsWithoutRef, FC } from 'react';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { deepmerge } from '@fastify/deepmerge';
import {
  createControlsProject,
  generateControls,
  type ReplaceReactNode,
} from './controls/generate';
import type { VariantInfo, WithControlProps } from './client/with-control';

type Awaitable<T> = T | Promise<T>;

export interface StoryOptions<C extends FC<any>> {
  /**
   * the export name of story, necessary for TypeScript Compiler.
   *
   * @defaultValue `story`
   */
  name?: string;
  displayName?: string;
  Component: C;

  /**
   * story arguments, you can pass an array of options for multiple presets.
   */
  args?: ArgsOptions<C> | (ArgsOptions<C> & VariantInfo)[];
}

export interface ArgsOptions<C extends FC<any> = FC<any>> {
  /**
   * the default values of arguments.
   */
  initial?: ComponentPropsWithoutRef<C> | (() => Awaitable<ComponentPropsWithoutRef<C>>);
  /**
   * fixed values for arguments, will disable the relevant controls.
   */
  fixed?:
    | Partial<ComponentPropsWithoutRef<C>>
    | (() => Awaitable<Partial<ComponentPropsWithoutRef<C>>>);
  /**
   * customize the generated controls, by default generated from component props using TypeScript compiler.
   */
  controls?:
    | {
        node: TypeNode;
      }
    | {
        /** modify generated node */
        transform?: (node: TypeNode) => TypeNode;
      };
}

export { type Cache } from './cache';
export { createFileSystemCache } from './cache/fs';

export interface Story<C extends FC<any> = FC<any>> {
  /** render as a server component (require RSC). */
  WithControl: FC;
  _private_: {
    component?: C;
  };
}

export type GetProps<Result> =
  Result extends Story<infer C>
    ? ReplaceReactNode<Omit<ComponentPropsWithoutRef<C>, 'key'>>
    : never;

export interface StoryFactoryOptions {
  cache?: Cache | false;

  tsc?: {
    /** default to `tsconfig.json` under cwd */
    tsconfigPath?: string;
  };
}

export interface StoryFactory {
  defineStory: <C extends FC<any>>(urlOrPath: URL | string, options: StoryOptions<C>) => Story<C>;
}

export function defineStoryFactory(factoryOptions: StoryFactoryOptions = {}): StoryFactory {
  let _project: ReturnType<typeof createControlsProject> | undefined;
  const { cache = false } = factoryOptions;
  const propsDeepmerge = deepmerge({
    mergeArray: () => (_target, source) => source,
  });

  function initProject() {
    const { tsconfigPath = './tsconfig.json' } = factoryOptions.tsc ?? {};
    return (_project ??= createControlsProject(tsconfigPath));
  }

  async function generateControlsCached(filePath: string, name: string): Promise<TypeNode> {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    return cached(cache, getHash(`controls:${filePath}:${name}:${fileContent}`), async () => {
      const project = await initProject();
      return generateControls('@fumadocs/story', project, filePath, name, fileContent);
    });
  }

  return {
    defineStory(urlOrPath, { Component, name = 'story', displayName, args = {} }) {
      const filePath =
        urlOrPath instanceof URL || urlOrPath.startsWith('file:///')
          ? fileURLToPath(urlOrPath)
          : urlOrPath;

      async function getProps(): Promise<WithControlProps> {
        const normalized = Array.isArray(args) ? args : [{ ...args, variant: 'default' }];

        return {
          Component,
          displayName,
          presets: await Promise.all(
            normalized.map(async (preset): Promise<WithControlProps['presets'][number]> => {
              const fixedValues =
                typeof preset.fixed === 'function' ? await preset.fixed() : preset.fixed;
              const initial =
                typeof preset.initial === 'function' ? await preset.initial() : preset.initial;
              let controls: TypeNode;

              if (preset.controls && 'node' in preset.controls) {
                controls = preset.controls.node;
              } else {
                controls = await generateControlsCached(filePath, name);

                if (preset.controls?.transform) controls = preset.controls.transform(controls);
                if (fixedValues) controls = collapse(controls, fixedValues);
              }

              return {
                variant: preset.variant,
                description: preset.description,
                controls,
                defaultValues: (fixedValues
                  ? propsDeepmerge(initial, fixedValues)
                  : initial) as Record<string, unknown>,
              };
            }),
          ),
        };
      }

      return {
        _private_: {
          component: Component,
        },
        async WithControl() {
          const { WithControl } = await import('./client/with-control');
          return <WithControl {...await getProps()} />;
        },
      };
    },
  };
}

export function getHash(v: string) {
  return createHash('SHA-256').update(v).digest('hex').slice(0, 32);
}
