import fs from 'node:fs/promises';
import { SyntaxKind } from 'ts-morph';
import { exists } from '@/utils/fs';
import { createEmptyProject } from '@/utils/typescript';

const tailwindConfigPaths = [
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.ts',
  'tailwind.config.mts',
];

async function findTailwindConfig(): Promise<string | undefined> {
  for (const configPath of tailwindConfigPaths) {
    if (await exists(configPath)) {
      return configPath;
    }
  }
}

export async function transformTailwind(options: {
  addContents: string[];
}): Promise<void> {
  const file = await findTailwindConfig();

  if (!file)
    throw new Error(
      'Cannot find Tailwind CSS configuration file, Tailwind CSS is required for this.',
    );

  const project = createEmptyProject();
  const configFile = project.createSourceFile(
    file,
    await fs.readFile(file).then((res) => res.toString()),
    { overwrite: true },
  );

  const exports = configFile.getExportAssignments();
  if (exports.length === 0) return;

  const contentNode = exports[0]
    .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((a) => a.getName() === 'content');

  if (!contentNode) throw new Error('No `content` detected');
  const arr = contentNode.getFirstDescendantByKind(
    SyntaxKind.ArrayLiteralExpression,
  );

  arr?.addElements(options.addContents.map((v) => JSON.stringify(v)));
  await configFile.save();
}
