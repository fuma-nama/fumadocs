import { IndentationText, Project, QuoteKind } from 'ts-morph';
import fs from 'node:fs/promises';

const project = new Project({
  manipulationSettings: {
    indentationText: IndentationText.TwoSpaces,
    quoteKind: QuoteKind.Single,
  },
});

export async function createSourceFile(path: string) {
  return project.createSourceFile(path, (await fs.readFile(path)).toString(), {
    overwrite: true,
  });
}

export function getCodeValue(v: string) {
  return new Function(`return ${v}`)();
}
