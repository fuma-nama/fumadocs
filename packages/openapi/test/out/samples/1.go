package main

import (
  "fmt"
  "io"
  "net/http"
  "strings"
)

func main() {
  url := "http://localhost:8080/hello_world?search=ai"
  body := strings.NewReader(`{
    "id": "id",
    "note": "it's \"quoted\" \\ ` + "`" + `a` + "`" + ` ${b}"
  }`)
  req, _ := http.NewRequest("GET", url, body)
  req.Header.Add("authorization", "Bearer")
  req.Header.Add("if-none-match", "\"etag\"")
  req.Header.Add("Cookie", "mode=light")
  req.Header.Add("Content-Type", "application/json")
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(resBody))
}