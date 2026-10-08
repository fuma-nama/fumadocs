import { cookieString, doubleQuote, indent, inputToString } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';

// java.net.http has no multipart API, so multipart bodies are written by hand
const boundary = 'form-data-boundary';

export const java: CodeUsageGenerator = {
  label: 'Java',
  lang: 'java',
  generate(data, { mediaAdapters }) {
    const imports = new Set([
      'java.net.URI',
      'java.net.http.HttpClient',
      'java.net.http.HttpRequest',
      'java.net.http.HttpResponse',
    ]);
    const multipart = data.bodyMediaType === 'multipart/form-data';
    const body = multipart
      ? multipartBody(data.body)
      : generateBodyExample(data, mediaAdapters, {
          lang: 'java',
          addImport: (name) => imports.add(name),
        });
    const request = [`.uri(URI.create(${doubleQuote(data.url)}))`];

    for (const k in data.header) {
      request.push(`.header(${doubleQuote(k)}, ${doubleQuote(data.header[k].value)})`);
    }

    if (body) {
      const type = multipart ? `multipart/form-data; boundary=${boundary}` : data.bodyMediaType!;

      request.push(`.header("Content-Type", ${doubleQuote(type)})`);
    }

    const cookie = cookieString(data.cookie);
    if (cookie) request.push(`.header("Cookie", ${doubleQuote(cookie)})`);
    request.push(
      `.method("${data.method.toUpperCase()}", ${body ? 'body' : 'HttpRequest.BodyPublishers.noBody()'})`,
      '.build();',
    );

    const s = Array.from(imports, (name) => `import ${name};`);
    s.push('');
    if (body) s.push(body);
    s.push(
      'HttpClient client = HttpClient.newHttpClient();',
      'HttpRequest request = HttpRequest.newBuilder()',
      indent(request.join('\n')),
      '',
      `try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println("Status code: " + response.statusCode());
  System.out.println("Response body: " + response.body());
} catch (Exception e) {
  e.printStackTrace();
}`,
    );

    return s.join('\n');
  },
};

function multipartBody(body: unknown): string | undefined {
  if (!body) return;

  let text = '';
  for (const [key, value] of Object.entries(body as object)) {
    if (value == null) continue;
    text += `--${boundary}\r\nContent-Disposition: form-data; name=${JSON.stringify(key)}\r\n\r\n${inputToString(value)}\r\n`;
  }

  return `var body = HttpRequest.BodyPublishers.ofString(${JSON.stringify(`${text}--${boundary}--\r\n`)});`;
}
