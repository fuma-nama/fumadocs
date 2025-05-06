import requests

url = "http://localhost:8080/hello_world?search=ai"
body = {
  "id": "id"
}
response = requests.request("GET", url, json = body, headers = {
  "authorization": "Bearer",
  "Content-Type": "application/json"
}, cookies = {
  "mode": "light"
})

print(response.text)