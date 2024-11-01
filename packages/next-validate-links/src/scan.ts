import fg from 'fast-glob';
import * as path from 'node:path';
import { stat } from 'node:fs/promises';

export type PopulateParams = Record<
  string,
  {
    value?: string[] | string;
    hashes?: string[];
    queries?: Record<string, string>[];
  }[]
>;

export type ScanOptions = {
  populate: PopulateParams;
};

export type ScanResult = {
  urls: Map<string, UrlMeta>;

  fallbackUrls: {
    url: RegExp;
    meta: UrlMeta;
  }[];
};

type UrlMeta = {
  hashes?: string[];
  queries?: Record<string, string>[];
};

const defaultMeta = {};
const defaultPopulate: PopulateParams[string] = [{}];

export async function scanURLs(options: ScanOptions): Promise<ScanResult> {
  const result: ScanResult = { urls: new Map(), fallbackUrls: [] };
  const isSrcDirectory = await stat('src/app')
    .then((res) => res.isDirectory())
    .catch(() => false);

  const files = await fg('**/page.tsx', {
    cwd: isSrcDirectory ? path.resolve('src/app') : path.resolve('app'),
  });

  files.forEach((file) => {
    const segments = file.split(path.sep).slice(0, -1);
    const out = populate(segments, options);

    out.forEach((entry) => {
      if (typeof entry.url === 'string') {
        result.urls.set('/' + entry.url, entry.meta ?? defaultMeta);
      } else {
        result.fallbackUrls.push({
          url: new RegExp(`^\\/${entry.url.source}$`),
          meta: entry.meta ?? defaultMeta,
        });
      }
    });
  });

  return result;
}

function populate(
  segments: string[],
  options: ScanOptions,
  contextPath: string = '',
): { url: string | RegExp; meta?: UrlMeta }[] {
  const current: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // route groups
    if (segment.startsWith('(') && segment.endsWith(')')) continue;
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const segmentPath = contextPath + segments.slice(0, i + 1).join('/');
      const next = populate(segments.slice(i + 1), options, segmentPath);
      const out: { url: string | RegExp; meta?: UrlMeta }[] = [];

      const segmentParams =
        segmentPath in options.populate
          ? options.populate[segmentPath]
          : defaultPopulate;

      segmentParams.forEach((param) => {
        const value = param.value;
        const prefix = value
          ? [...current, ...(Array.isArray(value) ? value : [value])].join('/')
          : [...current, '(.+)'].join('\\/');

        next.forEach((populated) => {
          let url: string | RegExp;

          if (!value) {
            url = new RegExp(
              [
                prefix,
                typeof populated.url === 'string'
                  ? populated.url.replaceAll('/', '\\/')
                  : populated.url.source,
              ]
                .filter(Boolean)
                .join('\\/'),
            );
          } else if (typeof populated.url === 'string') {
            url = [prefix, populated.url].filter(Boolean).join('/');
          } else {
            url = new RegExp(
              [prefix.replaceAll('/', '\\/'), populated.url.source]
                .filter(Boolean)
                .join('\\/'),
            );
          }

          out.push({
            url,
            meta: populated.meta ?? param,
          });
        });
      });

      return out;
    }

    current.push(segment);
  }

  return [
    {
      url: current.join('/'),
    },
  ];
}
