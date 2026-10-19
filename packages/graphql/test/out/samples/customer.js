const query = `query Customer($id: ID!) {
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
}`;

const variables = {
  "id": "1"
};

const response = await fetch("https://api.example.com/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>"
  },
  body: JSON.stringify({ query, variables }),
});

console.log(await response.json());