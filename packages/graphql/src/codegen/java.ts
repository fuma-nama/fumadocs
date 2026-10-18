import { javaTextBlock } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const java: CodeUsageGenerator = {
  label: 'Java',
  lang: 'java',
  generate({ url, query, variables, headers }) {
    // a final line break puts the closing delimiter on its own line
    let out = `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.stream.Collectors;

var query = ${javaTextBlock(`${query}\n`)};

`;
    if (variables) {
      out += `var variables = ${javaTextBlock(`${JSON.stringify(variables, null, 2)}\n`)};\n\n`;
    }
    out += `var body = "{\\"query\\": %s${variables ? ', \\"variables\\": %s' : ''}}".formatted(
  query.chars()
    .mapToObj(c -> c < 32 || c == '"' || c == '\\\\' ? "\\\\u%04x".formatted(c) : Character.toString(c))
    .collect(Collectors.joining("", "\\"", "\\""))${variables ? ',\n  variables' : ''}
);

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create(${JSON.stringify(url)}))
  .header("Content-Type", "application/json")
`;
    for (const name in headers) {
      out += `  .header(${JSON.stringify(name)}, ${JSON.stringify(headers[name])})\n`;
    }

    return `${out}  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();

try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println(response.body());
} catch (Exception e) {
  e.printStackTrace();
}`;
  },
};
