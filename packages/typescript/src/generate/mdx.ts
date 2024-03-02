import * as path from 'node:path';
import {
  type DocEntry,
  type GeneratedDoc,
  generateDocumentationFromProgram,
} from './base';
import { type TypescriptConfig, getProgram } from './program';

interface Templates {
  block: (doc: GeneratedDoc, children: string) => string;
  property: (entry: DocEntry) => string;
}

export interface GenerateMDXOptions {
  /**
   * a root directory to resolve relative file paths
   */
  basePath?: string;
  templates?: Partial<Templates>;
  options?: TypescriptConfig;
}

// \r?\n is required for cross-platform compatibility
const regex =
  /^---type-table---\r?\n(?<file>.+?)(?:#(?<name>.+))?\r?\n---end---$/gm;

const defaultTemplates: Templates = {
  block: (doc, c) => `### ${doc.name}

${doc.description}

<div className='flex flex-col gap-4 *:border-b [&>*:last-child]:border-b-0'>${c}</div>`,

  property: (c) => `<div className='text-sm text-muted-foreground'>

<div className="flex flex-row items-center gap-4">
  <code className="text-sm">${c.name}</code>
  <code className="text-muted-foreground">${c.type}</code>
</div>

${c.description || 'No Description'}

${Object.entries(c.tags)
  .map(([tag, value]) => `**${tag}:** ${replaceJsDocLinks(value)}`)
  .join('<br/>\n')}

</div>`,
};

export function generateMDX(
  source: string,
  { basePath = './', templates: overrides, options }: GenerateMDXOptions = {},
): string {
  const templates = { ...defaultTemplates, ...overrides };
  const program = getProgram(options);

  return source.replace(regex, (v, ...args) => {
    const groups = args[args.length - 1] as Record<string, string>;

    if (!groups.file || !groups.name) return v;

    const result = generateDocumentationFromProgram(program, {
      file: path.resolve(basePath, groups.file),
      name: groups.name,
      options,
    });

    if (!result) throw new Error(`Exported type ${groups.name} doesn't exist`);

    return templates.block(
      result,
      result.entries.map(templates.property).join('\n'),
    );
  });
}

function replaceJsDocLinks(md: string): string {
  return md.replace(/{@link (?<link>[^}]*)}/g, '$1');
}
