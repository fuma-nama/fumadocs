curl -X GET "http://localhost:8080/hello_world?search=ai" \
  -H "authorization: Bearer" \
  --cookie "mode=light" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "id"
  }'