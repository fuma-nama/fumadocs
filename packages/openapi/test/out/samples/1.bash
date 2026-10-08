curl -X GET 'http://localhost:8080/hello_world?search=ai' \
  -H 'authorization: Bearer' \
  -H 'if-none-match: "etag"' \
  --cookie 'mode=light' \
  -H 'Content-Type: application/json' \
  -d '{
  "id": "id",
  "note": "it'\''s \"quoted\" \\ `a` ${b}"
}'