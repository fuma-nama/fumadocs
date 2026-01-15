import { Project, type Type } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { typeToNode } from './lib/type-tree';
import type { Cache } from './lib/cache';
import type { TypeNode } from './lib/types';

export interface StoryOptions {
  from: {
    file: string;
    export: string;
  };
  tsconfigPath?: string;
  cache?: Cache | false;
}

export * from './lib/types';
export * from './lib/cache';

export interface StoryResult {
  props: TypeNode;
}

export async function defineStory(options: StoryOptions): Promise<StoryResult> {
  const filePath = path.resolve(options.from.file);
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Generate cache key based on file path, export name, and content hash
  const contentHash = createHash('MD5').update(fileContent).digest('hex').slice(0, 12);
  const cacheKey = `${filePath}:${options.from.export}:${contentHash}`;

  // Try to read from cache
  if (options.cache !== false) {
    const cached = await options.cache?.read(cacheKey);
    if (cached) {
      return cached as StoryResult;
    }
  }

  const project = new Project({
    tsConfigFilePath: options.tsconfigPath ?? './tsconfig.json',
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const exportedDeclarations = sourceFile.getExportedDeclarations();
  const declaration = exportedDeclarations.get(options.from.export)?.[0];

  if (!declaration) {
    throw new Error(`Export "${options.from.export}" not found in file "${options.from.file}"`);
  }

  const type = declaration.getType();
  const checker = project.getTypeChecker();

  // Extract props type from React component
  let propsType: Type | undefined;

  // Check if it's a function component
  const callSignatures = type.getCallSignatures();
  if (callSignatures.length > 0) {
    // Function component: props are the first parameter
    const firstParam = callSignatures[0]?.getParameters()[0];
    if (firstParam) {
      propsType = firstParam.getTypeAtLocation(declaration);
    }
  } else if (type.isClassOrInterface()) {
    // Class component: look for props property or constructor parameter
    const propsProperty = type.getProperty('props');
    if (propsProperty) {
      propsType = propsProperty.getTypeAtLocation(declaration);
    } else {
      // Try to get from constructor
      const constructSignatures = type.getConstructSignatures();
      if (constructSignatures.length > 0) {
        const firstParam = constructSignatures[0]?.getParameters()[0];
        if (firstParam) {
          propsType = firstParam.getTypeAtLocation(declaration);
        }
      }
    }
  } else if (type.isObject()) {
    // Already an object type, use it directly
    propsType = type;
  }

  if (!propsType) {
    // Fallback: use the type itself
    propsType = type;
  }

  const propsNode = typeToNode(propsType, checker, declaration);

  const result: StoryResult = {
    props: propsNode,
  };

  // Write to cache
  if (options.cache !== false) {
    await options.cache?.write(cacheKey, result);
  }

  return result;
}
