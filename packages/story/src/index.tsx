import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createTypeTreeBuilder,
  Handler,
  literalEnumHandler,
  reactNodeHandler,
} from './type-tree-builder';
import { cached, type Cache } from './cache';
import type { TypeNode } from './types';
import { ComponentPropsWithoutRef, FC } from 'react';
import { fileURLToPath } from 'node:url';
import { Project } from 'ts-morph';

type Awaitable<T> = T | Promise<T>;

export interface StoryOptions<C extends FC<any>> {
  /**
   * the export name of story
   *
   * @defaultValue `story`
   */
  name?: string;
  Component: C;
  cache?: Cache | false;

  /**
   * story arguments
   */
  args?: {
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
          /** default to `tsconfig.json` under cwd */
          tsconfigPath?: string;
          /** modify generated node */
          transform?: (node: TypeNode) => TypeNode;
          /** custom type-to-node handler */
          handlers?: Handler[];
        };
  };
}

export * from './types';
export { type Cache, createFileSystemCache } from './cache';

export interface StoryResult<C extends FC<any>> {
  WithControl: FC<undefined>;

  _static_: {
    component: C;
  };
}

export function defineStory<C extends FC<any>>(
  callerUrl: string,
  options: StoryOptions<C>,
): StoryResult<C> {
  const { Component, cache = false, name = 'story', args = {} } = options;
  const filePath = fileURLToPath(callerUrl);

  async function generateControls(): Promise<{
    propsNode: TypeNode;
  }> {
    const controls = args.controls ?? {};
    if ('node' in controls) return { propsNode: controls.node };

    const fileContent = await fs.readFile(filePath, 'utf-8');

    return cached(
      cache,
      createHash('MD5')
        .update(`extract-types:${filePath}:${name}:${fileContent}`)
        .digest('hex')
        .slice(0, 12),
      async () => {
        const project = new Project({
          tsConfigFilePath: controls.tsconfigPath ?? './tsconfig.json',
          skipAddingFilesFromTsConfig: true,
        });

        const injection = `export type _StoryProps_ = import('@fumadocs/story').GetProps<typeof ${name}>`;
        const sourceFile = project.createSourceFile(filePath, `${fileContent}\n${injection}`, {
          overwrite: true,
        });
        const exportedDeclarations = sourceFile.getExportedDeclarations();
        const declaration = exportedDeclarations.get('_StoryProps_')?.[0];

        if (!declaration) {
          throw new Error(`Export "${name}" not found in file "${filePath}"`);
        }

        const propsType = declaration.getType();
        let propsNode = createTypeTreeBuilder(project, [
          literalEnumHandler,
          reactNodeHandler,
          ...(controls.handlers ?? []),
        ]).typeToNode(propsType, declaration);
        if (controls.transform) propsNode = controls.transform(propsNode);
        return {
          propsNode,
        };
      },
    );
  }

  return {
    _static_: {
      component: Component,
    },
    async WithControl() {
      const { Story } = await import('./ui/story');
      const { propsNode } = await generateControls();
      return (
        <Story
          Component={Component}
          argTypes={propsNode}
          defaultValues={typeof args.initial === 'function' ? await args.initial() : args.initial}
        />
      );
    },
  };
}
