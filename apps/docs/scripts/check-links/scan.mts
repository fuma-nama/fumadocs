import fg from 'fast-glob';
import * as path from 'node:path';

export type PopulateParams = Record<string, string[][] | string[]>;

export async function scanURLs(params: PopulateParams): Promise<Set<string>> {
  const urls = new Set<string>();

  const files = await fg('**/page.tsx', {
    cwd: path.resolve('app'),
  });

  files.forEach((file) => {
    const segments = file.split(path.sep).slice(0, -1);
    const out = populate(segments, params);

    out.forEach((segments) => urls.add('/' + segments.join('/')));
  });

  return urls;
}

function populate(
  segments: string[],
  params: PopulateParams,
  contextPath: string = '',
): string[][] {
  const current: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // route groups
    if (segment.startsWith('(') && segment.endsWith(')')) continue;
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const segmentPath = contextPath + segments.slice(0, i + 1).join('/');

      if (segmentPath in params) {
        const segmentParams = params[segmentPath];
        const out: string[][] = [];

        segmentParams.forEach((param) => {
          populate(segments.slice(i + 1), params, segmentPath).forEach(
            (populated) => {
              out.push([
                ...current,
                ...(Array.isArray(param) ? param : [param]),
                ...populated,
              ]);
            },
          );
        });

        return out;
      } else {
        console.warn(`no default params for ${segmentPath}`);
      }
    }

    current.push(segment);
  }

  return [current];
}
