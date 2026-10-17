curl -X POST 'https://api.example.com/graphql' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "query Orders {\n  orders {\n    id\n  }\n}"
}'