import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.stream.Collectors;

var query = """
query Customer($id: ID!) {
  customer(id: $id) {
    id
    name
    contact {
      email
      phone
    }
    orders {
      id
      status
      createdAt
      total
      customer {
        id
        name
      }
    }
  }
}
""";

var variables = """
{
  "id": "1"
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
  .header("Authorization", "Bearer <token>")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();

try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println(response.body());
} catch (Exception e) {
  e.printStackTrace();
}