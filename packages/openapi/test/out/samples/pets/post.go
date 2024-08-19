package main

import (
  "fmt"
  "net/http"
  "io/ioutil"
  "strings"
)

func main() {
  url := "http://localhost:8080/pets"
  payload := strings.NewReader(`{
    "id": 0,
    "name": "string",
    "tag": "string"
  }`)
  
  req, _ := http.NewRequest("POST", url, payload)
  req.Header.Add("Content-Type", "application/json")
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  body, _ := ioutil.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(body))
}