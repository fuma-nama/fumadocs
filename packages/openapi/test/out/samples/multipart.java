import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

var body = HttpRequest.BodyPublishers.ofString("--form-data-boundary\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nMars\r\n--form-data-boundary\r\nContent-Disposition: form-data; name=\"image\"\r\n\r\n@mars.jpg\r\n--form-data-boundary--\r\n");
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create("http://localhost:8080/hello_world?search=ai"))
  .header("authorization", "Bearer")
  .header("if-none-match", "\"etag\"")
  .header("Content-Type", "multipart/form-data; boundary=form-data-boundary")
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