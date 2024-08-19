import requests

url = "http://localhost:8080/pets"
json = {
  "id": 0,
  "name": "string",
  "tag": "string"
}
response = requests.request("POST", url, json=json)

print(response.text)