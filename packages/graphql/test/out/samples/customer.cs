using System;
using System.Net.Http;
using System.Text;
using System.Text.Json.Nodes;

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

var variables = JsonNode.Parse("""
{
  "id": "1"
}
""");

var body = new JsonObject { ["query"] = query, ["variables"] = variables };

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer <token>");

var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
var response = await client.PostAsync("https://api.example.com/graphql", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());