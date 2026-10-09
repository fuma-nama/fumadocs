const body = JSON.stringify({
  "id": "id",
  "note": "it's \"quoted\" \\ `a` ${b}"
})

fetch("http://localhost:8080/hello_world?search=ai", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "authorization": "Bearer",
    "if-none-match": "\"etag\"",
    "cookie": "mode=light"
  },
  body
})