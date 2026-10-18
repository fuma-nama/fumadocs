using System;
using System.Net.Http;
using System.Text;
using System.Text.Json.Nodes;

var query = """
query Orders {
  orders {
    id
  }
}
""";

var body = new JsonObject { ["query"] = query };

var client = new HttpClient();

var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
var response = await client.PostAsync("https://api.example.com/graphql", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());