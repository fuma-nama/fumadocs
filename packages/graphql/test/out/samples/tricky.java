import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.stream.Collectors;

var query = """
# `backticks` ${x} $HOME !bang 'single' "double" \\ "# "##
query Tricky($text: String! = "say \\"hi\\" \\\\ ${x}") {
  echo(text: "日本語 🎉 \\n é 'single' `tick` $HOME !bang")
  block: echo(text: \"""
    "quoted" \\\""" escaped, \\\"\""" four quotes, "#"## end with a quote "
  \""")
  empty: echo(text: \"\"\"\""")
}
# ends with a quote "
""";

var variables = """
{
  "text": "q\\"uote 'single' \\\\ `tick` ${x} $HOME !bang \\"# \\"## \\"\\"\\" é 🎉\\nnewline",
  "large": 2147483648,
  "list": [
    true,
    null,
    10.5
  ]
}
""";

var body = "{\"query\": %s, \"variables\": %s}".formatted(
  query.chars()
    .mapToObj(c -> c < 32 || c == '"' || c == '\\' ? "\\u%04x".formatted(c) : Character.toString(c))
    .collect(Collectors.joining("", "\"", "\"")),
  variables
);

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create("https://api.example.com/graphql"))
  .header("Content-Type", "application/json")
  .header("X-Tricky", "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();

try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println(response.body());
} catch (Exception e) {
  e.printStackTrace();
}