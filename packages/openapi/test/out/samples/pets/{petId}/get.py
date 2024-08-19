import requests

url = "http://localhost:8080/pets/string"

response = requests.request("GET", url)

print(response.text)