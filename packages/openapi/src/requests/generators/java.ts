import { indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { resolveMediaAdapter } from '@/requests/media/adapter';

export const java: CodeUsageGenerator = {
  label: 'Java',
  lang: 'java',
  generate(url, data, { mediaAdapters }) {
    const s: string[] = [];
    const headers = { ...data.header };
    const imports = new Set<string>([
      'java.net.URI',
      'java.net.http.HttpClient',
      'java.net.http.HttpRequest',
      'java.net.http.HttpResponse',
      'java.net.http.HttpResponse.BodyHandlers',
      'java.time.Duration',
    ]);

    // Handle body if present
    let body: string | undefined;
    if (data.body && data.bodyMediaType) {
      const adapter = resolveMediaAdapter(data.bodyMediaType, mediaAdapters);
      body = adapter?.generateExample(data as { body: unknown }, {
        lang: 'java',
        addImport(specifier) {
          imports.add(specifier);
        },
      });
    }

    for (const value of imports.values()) {
      s.push(`import ${value};`);
    }
    s.push('');

    if (body) {
      s.push(body);
    }

    // Create HttpClient
    s.push('HttpClient client = HttpClient.newBuilder()');
    s.push(indent('.connectTimeout(Duration.ofSeconds(10))'));
    s.push(indent('.build();'));
    s.push('');

    // Build request
    s.push('HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()');
    s.push(indent(`.uri(URI.create(${JSON.stringify(url)}))`));

    // Add headers
    for (const [key, param] of Object.entries(headers)) {
      s.push(indent(`.header(${JSON.stringify(key)}, ${JSON.stringify(param.value)})`));
    }

    if (data.bodyMediaType) {
      s.push(indent(`.header("Content-Type", "${data.bodyMediaType}")`));
    }

    // Add cookies if present
    const cookies = Object.entries(data.cookie);

    if (cookies.length > 0) {
      const cookieString = cookies.map(([key, param]) => `${key}=${param.value}`).join('; ');

      s.push(indent(`.header("Cookie", ${JSON.stringify(cookieString)})`));
    }

    const arg = body ? 'body' : '';
    s.push(indent(`.${data.method.toUpperCase()}(${arg})`));
    s.push(indent('.build();'));
    s.push('');

    // Add response handling
    s.push('try {');
    s.push(
      indent(
        'HttpResponse<String> response = client.send(requestBuilder.build(), BodyHandlers.ofString());',
      ),
    );
    s.push(indent('System.out.println("Status code: " + response.statusCode());'));
    s.push(indent('System.out.println("Response body: " + response.body());'));
    s.push('} catch (Exception e) {');
    s.push(indent('e.printStackTrace();'));
    s.push('}');

    return s.join('\n');
  },
};
