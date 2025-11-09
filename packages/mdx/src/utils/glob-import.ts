import { glob } from 'tinyglobby';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface GlobImportOptions {
  base: string;
  query?: Record<string, string>;
  import?: string;
}

export async function generateGlobImport(
  patterns: string | string[],
  options: GlobImportOptions,
): Promise<string> {
  let code: string = '{';
  const result = await glob(patterns, {
    cwd: options.base,
  });

  for (const item of result) {
    const fullPath = path.join(options.base, item);
    const url = pathToFileURL(fullPath);

    for (const [k, v] of Object.entries(options.query ?? {})) {
      url.searchParams.set(k, v);
    }

    let line = `${JSON.stringify(item)}: () => import(${JSON.stringify(url.href)})`;
    if (options.import) {
      line += `.then(mod => mod[${JSON.stringify(options.import)}])`;
    }

    code += `${line}, `;
  }

  code += '}';
  return code;
}
