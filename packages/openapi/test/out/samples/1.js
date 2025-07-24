const body = JSON.stringify({
  "id": "id"
})

fetch("http://localhost:8080/hello_world?search=ai", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "authorization": "Bearer",
    "cookie": "mode=light"
  },
  body
})