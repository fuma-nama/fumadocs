curl -X POST 'https://api.example.com/graphql' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
  "query": "query Customer($id: ID!) {\n  customer(id: $id) {\n    id\n    name\n    contact {\n      email\n      phone\n    }\n    orders {\n      id\n      status\n      createdAt\n      total\n      customer {\n        id\n        name\n      }\n    }\n  }\n}",
  "variables": {
    "id": "1"
  }
}'