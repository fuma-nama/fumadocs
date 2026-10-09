import requests

url = "http://localhost:8080/hello_world?search=ai"
body = {
  "name": (None, "Mars"),
  "image": (None, "@mars.jpg"),
}
response = requests.request("POST", url, files = body, headers = {
  "authorization": "Bearer", 
  "if-none-match": "\"etag\""
}, cookies = {
  "mode": "light"
})

print(response.text)