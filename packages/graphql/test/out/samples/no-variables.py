import requests

query = """query Orders {
  orders {
    id
  }
}"""

response = requests.post(
    "https://api.example.com/graphql",
    json={"query": query},
)

print(response.json())