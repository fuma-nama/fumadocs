package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

const query = `# ` + "`" + `backticks` + "`" + ` ${x} $HOME !bang 'single' "double" \ "# "##
query Tricky($text: String! = "say \"hi\" \\ ${x}") {
  echo(text: "日本語 🎉 \n é 'single' ` + "`" + `tick` + "`" + ` $HOME !bang")
  block: echo(text: """
    "quoted" \""" escaped, \"""" four quotes, "#"## end with a quote "
  """)
  empty: echo(text: """""")
}
# ends with a quote "`

const variables = `{
  "text": "q\"uote 'single' \\ ` + "`" + `tick` + "`" + ` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
  "large": 2147483648,
  "list": [
    true,
    null,
    10.5
  ]
}`

func main() {
  body, _ := json.Marshal(map[string]any{"query": query, "variables": json.RawMessage(variables)})
  req, _ := http.NewRequest("POST", "https://api.example.com/graphql", bytes.NewReader(body))
  req.Header.Set("Content-Type", "application/json")
  req.Header.Set("X-Tricky", "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#")

  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(string(resBody))
}