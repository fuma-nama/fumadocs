import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.stream.Collectors;

var query = """
query Orders {
  orders {
    id
  }
}
""";

var body = "{\"query\": %s}".formatted(
  query.chars()
    .mapToObj(c -> c < 32 || c == '"' || c == '\\' ? "\\u%04x".formatted(c) : Character.toString(c))
    .collect(Collectors.joining("", "\"", "\""))
);

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create("https://api.example.com/graphql"))
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();

try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println(response.body());
} catch (Exception e) {
  e.printStackTrace();
}