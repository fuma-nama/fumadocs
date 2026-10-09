using System;
using System.Net.Http;
using System.Text;

var body = new StringContent("""
{
  "id": "id",
  "note": "it's \"quoted\" \\ `a` ${b}"
}
""", Encoding.UTF8, "application/json");

var client = new HttpClient();
client.DefaultRequestHeaders.Add("authorization", "Bearer");
client.DefaultRequestHeaders.Add("if-none-match", "\"etag\"");
client.DefaultRequestHeaders.Add("cookie", "mode=light");
var request = new HttpRequestMessage(HttpMethod.Get, "http://localhost:8080/hello_world?search=ai") { Content = body };
var response = await client.SendAsync(request);
var responseBody = await response.Content.ReadAsStringAsync();