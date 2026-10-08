using System;
using System.Net.Http;
using System.Text;

var body = new MultipartFormDataContent();
body.Add(new StringContent("Mars"), "name");
body.Add(new StringContent("@mars.jpg"), "image");

var client = new HttpClient();
client.DefaultRequestHeaders.Add("authorization", "Bearer");
client.DefaultRequestHeaders.Add("if-none-match", "\"etag\"");
client.DefaultRequestHeaders.Add("cookie", "mode=light");
var request = new HttpRequestMessage(HttpMethod.Post, "http://localhost:8080/hello_world?search=ai") { Content = body };
var response = await client.SendAsync(request);
var responseBody = await response.Content.ReadAsStringAsync();