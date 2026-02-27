using System;
using System.Net.Http;
using System.Text;

var body = new StringContent("""
{
  "id": "id"
}
""", Encoding.UTF8, "application/json");

var client = new HttpClient();
client.DefaultRequestHeaders.Add("authorization", "Bearer");
client.DefaultRequestHeaders.Add("cookie", "mode=light");
var response = await client.GetAsync("http://localhost:8080/hello_world?search=ai", body);
var responseBody = await response.Content.ReadAsStringAsync();