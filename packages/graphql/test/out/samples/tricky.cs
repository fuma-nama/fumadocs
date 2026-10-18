using System;
using System.Net.Http;
using System.Text;
using System.Text.Json.Nodes;

var query = """""""
# `backticks` ${x} $HOME !bang 'single' "double" \ "# "##
query Tricky($text: String! = "say \"hi\" \\ ${x}") {
  echo(text: "日本語 🎉 \n é 'single' `tick` $HOME !bang")
  block: echo(text: """
    "quoted" \""" escaped, \"""" four quotes, "#"## end with a quote "
  """)
  empty: echo(text: """""")
}
# ends with a quote "
""""""";

var variables = JsonNode.Parse("""
{
  "text": "q\"uote 'single' \\ `tick` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
  "large": 2147483648,
  "list": [
    true,
    null,
    10.5
  ]
}
""");

var body = new JsonObject { ["query"] = query, ["variables"] = variables };

var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-Tricky", "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#");

var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
var response = await client.PostAsync("https://api.example.com/graphql", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());