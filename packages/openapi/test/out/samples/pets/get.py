import requests

url = "http://localhost:8080/pets?limit=100"

response = requests.request("GET", url)

print(response.text)