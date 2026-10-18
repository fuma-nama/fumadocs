import requests

query = """query Customer($id: ID!) {
  customer(id: $id) {
    id
    name
    contact {
      email
      phone
    }
    orders {
      id
      status
      createdAt
      total
      customer {
        id
        name
      }
    }
  }
}"""

variables = {
    "id": "1"
}

response = requests.post(
    "https://api.example.com/graphql",
    json={"query": query, "variables": variables},
    headers={"Authorization": "Bearer <token>"},
)

print(response.json())