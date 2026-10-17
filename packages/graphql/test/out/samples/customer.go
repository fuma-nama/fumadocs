package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
)

const query = `query Customer($id: ID!) {
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
}`

const variables = `{
  "id": "1"
}`

func main() {
  body, _ := json.Marshal(map[string]any{"query": query, "variables": json.RawMessage(variables)})
  req, _ := http.NewRequest("POST", "https://api.example.com/graphql", bytes.NewReader(body))
  req.Header.Set("Content-Type", "application/json")
  req.Header.Set("Authorization", "Bearer <token>")

  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(string(resBody))
}