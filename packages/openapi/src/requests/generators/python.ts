import type { CodeUsageGenerator } from '@/requests/generators';
import { resolveMediaAdapter } from '@/requests/media/adapter';

export const python: CodeUsageGenerator = {
  label: 'Python',
  lang: 'python',
  generate(url, data, { mediaAdapters }) {
    const headers: Record<string, string> = {};
    const imports = new Set<string>();
    const params = [`"${data.method}"`, 'url'];
    let body: string | undefined;

    imports.add('requests');

    if (data.body && data.bodyMediaType) {
      const adapter = resolveMediaAdapter(data.bodyMediaType, mediaAdapters);
      headers['Content-Type'] = data.bodyMediaType;

      body = adapter?.generateExample(data as { body: unknown }, {
        lang: 'python',
      });

      if (body) {
        params.push('data = body');
      }
    }

    for (const [k, v] of Object.entries(data.header)) {
      headers[k] = v.value;
    }

    if (Object.keys(headers).length > 0) {
      params.push(`headers = ${generatePythonObject(headers, imports)}`);
    }

    const inputCookies = Object.entries(data.cookie);
    if (inputCookies.length > 0) {
      const cookies: Record<string, string> = {};

      for (const [k, v] of inputCookies) {
        cookies[k] = v.value;
      }

      params.push(`cookies = ${generatePythonObject(cookies, imports)}`);
    }

    return `${Array.from(imports)
      .map((name) => 'import ' + name)
      .join('\n')}

url = ${JSON.stringify(url)}
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
    return JSON.stringify(v);
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
      ([key, value]) => `  ${JSON.stringify(key)}: ${generatePythonObject(value, imports)}`,
    );
    return `{\n${entries.join(', \n')}\n}`;
  } else {
    throw new Error(`Unsupported type: ${typeof v}`);
  }
}
