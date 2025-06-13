package main

import (
  "fmt"
  "net/http"
  "io/ioutil"
  "strings"
)

func main() {
  url := "http://localhost:8080/hello_world?search=ai"
  body := strings.NewReader(`{
    "id": "id"
  }`)
  req, _ := http.NewRequest("GET", url, body)
  req.Header.Add("authorization", "Bearer")
  req.Header.Add("Cookie", "mode=light")
  req.Header.Add("Content-Type", "application/json")
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  body, _ := ioutil.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(body))
}