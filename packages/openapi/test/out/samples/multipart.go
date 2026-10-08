package main

import (
  "fmt"
  "io"
  "net/http"
  "bytes"
  "mime/multipart"
)

func main() {
  url := "http://localhost:8080/hello_world?search=ai"
  body := new(bytes.Buffer)
  mp := multipart.NewWriter(body)
  mp.WriteField("name", "Mars")
  mp.WriteField("image", "@mars.jpg")
  mp.Close()
  req, _ := http.NewRequest("POST", url, body)
  req.Header.Add("authorization", "Bearer")
  req.Header.Add("if-none-match", "\"etag\"")
  req.Header.Add("Cookie", "mode=light")
  req.Header.Add("Content-Type", mp.FormDataContentType())
  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()
  resBody, _ := io.ReadAll(res.Body)

  fmt.Println(res)
  fmt.Println(string(resBody))
}