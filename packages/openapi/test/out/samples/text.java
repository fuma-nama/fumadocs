import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;

var body = BodyPublishers.ofString("""
  "quoted" \"\""" `${x}` \\ "#\s
	tabbed	\n\
ends with "\"\
""");
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create("http://localhost:8080/hello_world?search=ai"))
  .header("authorization", "Bearer")
  .header("if-none-match", "\"etag\"")
  .header("Content-Type", "text/plain")
  .header("Cookie", "mode=light")
  .method("POST", body)
  .build();

try {
  HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
  System.out.println("Status code: " + response.statusCode());
  System.out.println("Response body: " + response.body());
} catch (Exception e) {
  e.printStackTrace();
}