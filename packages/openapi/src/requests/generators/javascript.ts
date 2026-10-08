import { cookieString, doubleQuote, indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';

export const javascript: CodeUsageGenerator = {
  label: 'JavaScript',
  lang: 'js',
  generate(data, { mediaAdapters }) {
    const s: string[] = [];
    const body = generateBodyExample(data, mediaAdapters, {
      lang: 'js',
      addImport(from, name) {
        s.push(`import { ${name} } from "${from}"`);
      },
    });
    const headers: Record<string, string> = {};

    // `fetch()` sets the boundary of `FormData` bodies
    if (body && data.bodyMediaType !== 'multipart/form-data') {
      headers['Content-Type'] = data.bodyMediaType!;
    }

    for (const k in data.header) headers[k] = data.header[k].value;
    const cookie = cookieString(data.cookie);
    if (cookie) headers.cookie = cookie;

    const options = [`method: "${data.method.toUpperCase()}"`];
    if (Object.keys(headers).length > 0) {
      options.push(`headers: ${JSON.stringify(headers, null, 2)}`);
    }

    if (body) {
      s.push(body);
      options.push('body');
    }

    s.push(`fetch(${doubleQuote(data.url)}, {\n${indent(options.join(',\n'))}\n})`);
    return s.join('\n\n');
  },
};
