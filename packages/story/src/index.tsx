import * as fs from 'node:fs/promises';
import { createTypeTreeBuilder, literalEnumHandler } from './type-tree/builder';
import { cached, type Cache } from './cache';
import type { TypeNode } from './type-tree/types';
import { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import { fileURLToPath } from 'node:url';
import { Project } from 'ts-morph';
import { getHash } from './utils/get-hash';

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
   * the default values of arguments
   */
  initial?: ComponentPropsWithoutRef<C> | (() => Awaitable<ComponentPropsWithoutRef<C>>);
  /**
   * customise the generated controls, by default generated from component props using TypeScript compiler.
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

export { type Cache, createFileSystemCache } from './cache';

export interface StoryResult<C extends FC<any>> {
  WithControl: FC<undefined>;

  _private_: {
    component: C;
  };
}

export type GetProps<Result> =
  Result extends StoryResult<infer C>
    ? ReplaceReactNode<Omit<ComponentPropsWithoutRef<C>, 'key'>>
    : never;

type ReplaceReactNode<V> = ReactNode extends V
  ? ReplaceReactNode<Exclude<V, ReactNode>> | string
  : V extends Record<string, unknown>
    ? {
        [K in keyof V]: ReplaceReactNode<V[K]>;
      }
    : V;

export interface StoryFactoryOptions {
  cache?: Cache | false;

  tsc?: {
    /** default to `tsconfig.json` under cwd */
    tsconfigPath?: string;
  };
}

export interface StoryFactory {
  defineStory: <C extends FC<any>>(callerUrl: string, options: StoryOptions<C>) => StoryResult<C>;
}

export interface VariantInfo {
  variant: string;
  description?: string;
}

export function defineStoryFactory(factoryOptions: StoryFactoryOptions = {}): StoryFactory {
  let _project: Project | undefined;
  const { cache = false, tsc: { tsconfigPath } = {} } = factoryOptions;

  function initProject() {
    return (_project ??= new Project({
      tsConfigFilePath: tsconfigPath ?? './tsconfig.json',
      skipAddingFilesFromTsConfig: true,
    }));
  }

  return {
    defineStory(callerUrl, { Component, name = 'story', displayName, args = {} }) {
      const filePath = fileURLToPath(callerUrl);

      async function generateDefaultControls({ controls = {} }: ArgsOptions): Promise<TypeNode> {
        if ('node' in controls) return controls.node;

        const fileContent = await fs.readFile(filePath, 'utf-8');
        let propsNode = await cached(
          cache,
          getHash(`extract-types:${filePath}:${name}:${fileContent}`),
          async () => {
            const project = initProject();
            const injection = `export type _StoryProps_ = import('@fumadocs/story').GetProps<typeof ${name}>`;
            const sourceFile = project.createSourceFile(filePath, `${fileContent}\n${injection}`, {
              overwrite: true,
            });
            const exportedDeclarations = sourceFile.getExportedDeclarations();
            const declaration = exportedDeclarations.get('_StoryProps_')?.[0];

            if (!declaration) {
              throw new Error(`Export "${name}" not found in file "${filePath}"`);
            }

            return createTypeTreeBuilder(project, [literalEnumHandler]).typeToNode(
              declaration.getType(),
              declaration,
            );
          },
        );

        if (controls.transform) propsNode = controls.transform(propsNode);
        return propsNode;
      }

      return {
        _private_: {
          component: Component,
        },
        async WithControl() {
          const { Story } = await import('./ui/story');
          const presets: (ArgsOptions & VariantInfo)[] = Array.isArray(args)
            ? args
            : [{ ...args, variant: 'default' }];

          return (
            <Story
              displayName={displayName}
              Component={Component}
              presets={await Promise.all(
                presets.map(async (preset) => ({
                  variant: preset.variant,
                  description: preset.description,
                  controls: await generateDefaultControls(preset),
                  defaultValues:
                    typeof preset.initial === 'function' ? await preset.initial() : preset.initial,
                })),
              )}
            />
          );
        },
      };
    },
  };
}

export const { defineStory } = defineStoryFactory();
