import { csharpRawString } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const csharp: CodeUsageGenerator = {
  label: 'C#',
  lang: 'csharp',
  generate({ url, query, variables, headers }) {
    let out = `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json.Nodes;

var query = ${csharpRawString(query)};

`;
    if (variables) {
      out += `var variables = JsonNode.Parse(${csharpRawString(JSON.stringify(variables, null, 2))});\n\n`;
    }
    // `JsonNode` serializes without reflection, which file-based apps disable
    out += `var body = new JsonObject { ["query"] = query${variables ? ', ["variables"] = variables' : ''} };

var client = new HttpClient();
`;
    for (const name in headers) {
      out += `client.DefaultRequestHeaders.Add(${JSON.stringify(name)}, ${JSON.stringify(headers[name])});\n`;
    }

    return `${out}
var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
var response = await client.PostAsync(${JSON.stringify(url)}, content);
Console.WriteLine(await response.Content.ReadAsStringAsync());`;
  },
};
