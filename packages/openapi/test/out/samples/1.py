import requests

url = "http://localhost:8080/hello_world?search=ai"

response = requests.request("GET", url, json = {
  "id": "id"
}, headers = {
  "authorization": "Bearer"
}, cookies = {
  "mode": "light"
})

print(response.text)