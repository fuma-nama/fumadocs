const body = new FormData();
body.append("name", "Mars")
body.append("image", "@mars.jpg")

fetch("http://localhost:8080/hello_world?search=ai", {
  method: "POST",
  headers: {
    "authorization": "Bearer",
    "if-none-match": "\"etag\"",
    "cookie": "mode=light"
  },
  body
})