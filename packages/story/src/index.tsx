import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createTypeTreeBuilder, literalEnumHandler } from './type-tree-builder';
import { cached, type Cache } from './cache';
import type { TypeNode } from './types';
import { FC } from 'react';
import { fileURLToPath } from 'node:url';

export interface StoryOptions<C extends FC<any>> {
  /**
   * the export name of story
   *
   * @defaultValue `story`
   */
  name?: string;
  Component: C;
  tsconfigPath?: string;
  cache?: Cache | false;
}

export * from './types';
export * from './cache';

export interface StoryResult<C extends FC<any>> {
  analysis: {
    props: TypeNode;
  };

  WithControl: FC<undefined>;

  _static_: {
    component: C;
  };
}

export async function defineStory<C extends FC<any>>(
  callerUrl: string,
  options: StoryOptions<C>,
): Promise<StoryResult<C>> {
  const { Component, cache = false, tsconfigPath = './tsconfig.json', name = 'story' } = options;
  const filePath = fileURLToPath(callerUrl);
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Generate cache key based on file path, export name, and content hash
  const contentHash = createHash('MD5').update(fileContent).digest('hex').slice(0, 12);

  const { propsNode } = await cached(
    cache,
    `extract-types:${filePath}:${name}:${contentHash}`,
    async () => {
      const { Project } = await import('ts-morph');
      const project = new Project({
        tsConfigFilePath: tsconfigPath,
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
      const typeTreeBuilder = createTypeTreeBuilder([literalEnumHandler]);
      return {
        propsNode: typeTreeBuilder.typeToNode(propsType, declaration),
      };
    },
  );

  return {
    _static_: {
      component: Component,
    },
    analysis: {
      props: propsNode,
    },
    async WithControl() {
      const { Story } = await import('./ui/story');

      return <Story Component={Component} argTypes={propsNode} />;
    },
  };
}
