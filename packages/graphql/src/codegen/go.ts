import { goString } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const go: CodeUsageGenerator = {
  label: 'Go',
  lang: 'go',
  generate({ url, query, variables, headers }) {
    let out = `package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

const query = ${goString(query)}
`;
    if (variables) out += `\nconst variables = ${goString(JSON.stringify(variables, null, 2))}\n`;
    out += `
func main() {
  body, _ := json.Marshal(map[string]any{"query": query${variables ? ', "variables": json.RawMessage(variables)' : ''}})
  req, _ := http.NewRequest("POST", ${JSON.stringify(url)}, bytes.NewReader(body))
  req.Header.Set("Content-Type", "application/json")
`;
    for (const name in headers) {
      out += `  req.Header.Set(${JSON.stringify(name)}, ${JSON.stringify(headers[name])})\n`;
    }

    return `${out}
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(string(resBody))
}`;
  },
};
