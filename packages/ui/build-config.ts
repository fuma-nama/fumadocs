import path from 'node:path';
import fs from 'node:fs/promises';

function getOutPath(src: string): string {
  const replacedPath = src
    .split('/')
    .map((v) => (v === 'src' ? 'dist' : v))
    .join('/');

  const info = path.parse(replacedPath);

  return path.join('./', info.dir, `${info.name}.js`).replace(path.sep, '/');
}

/**
 * Inject imports for client components
 */
export async function injectImport(src: string): Promise<void> {
  const srcOut = getOutPath(src);
  const sourceContent = (await fs.readFile(src)).toString();
  let outContent = (await fs.readFile(srcOut)).toString();

  const regex =
    /^declare const {(?<names>(?:.|\n)*?)}: typeof import\((?<from>.+)\)/gm;
  let result;

  while ((result = regex.exec(sourceContent)) && result.groups) {
    const { from, names } = result.groups;
    const importName = from.slice(1, from.length - 1);
    const replaceTo = `import {${names}} from ${JSON.stringify(importName)}`;

    outContent = `${replaceTo}\n${outContent}`;
  }

  await fs.writeFile(srcOut, outContent);
}
