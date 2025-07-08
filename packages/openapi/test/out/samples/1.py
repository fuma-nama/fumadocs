import requests

url = "http://localhost:8080/hello_world?search=ai"
body = {
  "id": "id"
}
response = requests.request("GET", url, json = body, headers = {
  "Content-Type": "application/json",
  "authorization": "Bearer"
}, cookies = {
  "mode": "light"
})

print(response.text)