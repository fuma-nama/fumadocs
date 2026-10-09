curl -X POST 'http://localhost:8080/hello_world?search=ai' \
  -H 'authorization: Bearer' \
  -H 'if-none-match: "etag"' \
  --cookie 'mode=light' \
  -F 'name=Mars' \
  -F 'image=@mars.jpg'