'use client';
import { ident, type SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
  const s: string[] = [];
  const options = new Map<string, string>();
  const headers = { ...data.header };

  if (Object.keys(data.cookie).length > 0) {
    headers['cookie'] = Object.entries(data.cookie)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  if (Object.keys(headers).length > 0) {
    options.set('headers', JSON.stringify(headers, null, 2));
  }

  let body: string | undefined;
  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    body = mediaAdapters[data.bodyMediaType].generateExample(data, {
      lang: 'js',
      addImport(from, name) {
        s.unshift(`import { ${name} } from "${from}"`);
      },
    });
  }

  if (body) {
    s.push(body);
    options.set('body', 'body');
  }

  const params = [JSON.stringify(resolveRequestData(url, data))];
  if (options.size > 0) {
    const str = Array.from(options.entries())
      .map(([k, v]) => ident(k === v ? k : `${k}: ${v}`))
      .join(',\n');

    params.push(`{\n${str}\n}`);
  }

  s.push(`fetch(${params.join(', ')})`);

  return s.join('\n\n');
};
