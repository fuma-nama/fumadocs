import requests

url = "http://localhost:8080/hello_world?search=ai"
body = """  "quoted" \"\""" `${x}` \\ "# 
	tabbed	
ends with "\""""
response = requests.request("POST", url, data = body, headers = {
  "Content-Type": "text/plain", 
  "authorization": "Bearer", 
  "if-none-match": "\"etag\""
}, cookies = {
  "mode": "light"
})

print(response.text)