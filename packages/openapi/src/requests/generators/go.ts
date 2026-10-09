import { cookieString, doubleQuote, indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';

export const go: CodeUsageGenerator = {
  label: 'Go',
  lang: 'go',
  generate(data, { mediaAdapters }) {
    const imports = new Set(['fmt', 'io', 'net/http']);
    const body = generateBodyExample(data, mediaAdapters, {
      lang: 'go',
      addImport: (name) => imports.add(name),
    });
    const s = [`url := ${doubleQuote(data.url)}`];

    if (body) s.push(body);
    s.push(
      `req, _ := http.NewRequest("${data.method.toUpperCase()}", url, ${body ? 'body' : 'nil'})`,
    );
    for (const k in data.header) {
      s.push(`req.Header.Add(${doubleQuote(k)}, ${doubleQuote(data.header[k].value)})`);
    }

    const cookie = cookieString(data.cookie);
    if (cookie) s.push(`req.Header.Add("Cookie", ${doubleQuote(cookie)})`);
    if (body) {
      const type =
        data.bodyMediaType === 'multipart/form-data'
          ? 'mp.FormDataContentType()'
          : doubleQuote(data.bodyMediaType!);

      s.push(`req.Header.Add("Content-Type", ${type})`);
    }

    s.push(
      'res, _ := http.DefaultClient.Do(req)',
      'defer res.Body.Close()',
      'resBody, _ := io.ReadAll(res.Body)',
      '',
      'fmt.Println(res)',
      'fmt.Println(string(resBody))',
    );

    return `package main

import (
${indent(Array.from(imports, (name) => `"${name}"`).join('\n'))}
)

func main() {
${indent(s.join('\n'))}
}`;
  },
};
