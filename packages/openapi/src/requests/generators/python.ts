import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';
import { doubleQuote } from '../string-utils';

export const python: CodeUsageGenerator = {
  label: 'Python',
  lang: 'python',
  generate(data, { mediaAdapters }) {
    const imports = new Set(['requests']);
    const body = generateBodyExample(data, mediaAdapters, { lang: 'python' });
    const params = [`"${data.method.toUpperCase()}"`, 'url'];
    const headers: Record<string, string> = {};

    // requests sets the boundary of `files`
    if (body && data.bodyMediaType === 'multipart/form-data') {
      params.push('files = body');
    } else if (body) {
      headers['Content-Type'] = data.bodyMediaType!;
      params.push('data = body');
    }

    for (const k in data.header) headers[k] = data.header[k].value;
    if (Object.keys(headers).length > 0) {
      params.push(`headers = ${generatePythonObject(headers, imports)}`);
    }

    const cookies: Record<string, string> = {};
    for (const k in data.cookie) cookies[k] = data.cookie[k].value;
    if (Object.keys(cookies).length > 0) {
      params.push(`cookies = ${generatePythonObject(cookies, imports)}`);
    }

    return `${Array.from(imports, (name) => `import ${name}`).join('\n')}

url = ${doubleQuote(data.url)}
${body ?? ''}
response = requests.request(${params.join(', ')})

print(response.text)`;
  },
};

export function generatePythonObject(v: unknown, imports: Set<string>): string {
  if (v === null) {
    return 'None';
  } else if (typeof v === 'boolean') {
    return v ? 'True' : 'False';
  } else if (typeof v === 'string') {
    return doubleQuote(v);
  } else if (typeof v === 'number') {
    return v.toString();
  } else if (Array.isArray(v)) {
    const items = v.map((item) => generatePythonObject(item, imports));
    return `[${items.join(', ')}]`;
  } else if (v instanceof Date) {
    imports.add('datetime');
    return `datetime.datetime(${v.getFullYear()}, ${v.getMonth() + 1}, ${v.getDate()}, ${v.getHours()}, ${v.getMinutes()}, ${v.getSeconds()}, ${v.getMilliseconds()})`;
  } else if (typeof v === 'object') {
    const entries = Object.entries(v).map(
      ([key, value]) => `  ${doubleQuote(key)}: ${generatePythonObject(value, imports)}`,
    );
    return `{\n${entries.join(', \n')}\n}`;
  } else {
    throw new Error(`Unsupported type: ${typeof v}`);
  }
}
