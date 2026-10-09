import requests

url = "http://localhost:8080/hello_world?search=ai"
body = """{
  "id": "id",
  "note": "it's \\"quoted\\" \\\\ `a` ${b}"
}"""
response = requests.request("GET", url, data = body, headers = {
  "Content-Type": "application/json", 
  "authorization": "Bearer", 
  "if-none-match": "\"etag\""
}, cookies = {
  "mode": "light"
})

print(response.text)