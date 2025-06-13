'use client';
import { ident, type SampleGenerator } from '@/requests/_shared';
import { resolveRequestData } from '@/utils/url';

export const generator: SampleGenerator = (url, data, { mediaAdapters }) => {
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
  if (data.body && data.bodyMediaType && data.bodyMediaType in mediaAdapters) {
    const adapter = mediaAdapters[data.bodyMediaType];

    body = adapter.generateExample(data, {
      lang: 'java',
      addImport: (specifier) => {
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
  s.push(ident('.connectTimeout(Duration.ofSeconds(10))'));
  s.push(ident('.build();'));
  s.push('');

  // Build request
  s.push('HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()');
  s.push(
    ident(`.uri(URI.create(${JSON.stringify(resolveRequestData(url, data))}))`),
  );

  // Add headers
  for (const [key, value] of Object.entries(headers)) {
    s.push(ident(`.header(${JSON.stringify(key)}, ${JSON.stringify(value)})`));
  }

  if (data.bodyMediaType) {
    s.push(ident(`.header("Content-Type", "${data.bodyMediaType}")`));
  }

  // Add cookies if present
  const cookieString = Object.entries(data.cookie)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  if (cookieString.length > 0) {
    s.push(ident(`.header("Cookie", ${JSON.stringify(cookieString)})`));
  }

  const arg = body ? 'body' : '';
  s.push(ident(`.${data.method.toUpperCase()}(${arg})`));
  s.push(ident('.build();'));
  s.push('');

  // Add response handling
  s.push('try {');
  s.push(
    ident(
      'HttpResponse<String> response = client.send(requestBuilder.build(), BodyHandlers.ofString());',
    ),
  );
  s.push(ident('System.out.println("Status code: " + response.statusCode());'));
  s.push(ident('System.out.println("Response body: " + response.body());'));
  s.push('} catch (Exception e) {');
  s.push(ident('e.printStackTrace();'));
  s.push('}');

  return s.join('\n');
};
