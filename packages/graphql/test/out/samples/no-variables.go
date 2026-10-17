package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

const query = `query Orders {
  orders {
    id
  }
}`

func main() {
  body, _ := json.Marshal(map[string]any{"query": query})
  req, _ := http.NewRequest("POST", "https://api.example.com/graphql", bytes.NewReader(body))
  req.Header.Set("Content-Type", "application/json")

  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(string(resBody))
}