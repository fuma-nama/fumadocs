import requests

url = "http://localhost:8080/hello_world?search=ai"
json = {
  "id": "id"
}
headers = {
  "authorization": "Bearer"
}
cookies = {
  "mode": "light"
}
response = requests.request("GET", url, json=json, headers=headers, cookies=cookies)

print(response.text)