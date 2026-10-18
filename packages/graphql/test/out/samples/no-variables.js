const query = `query Orders {
  orders {
    id
  }
}`;

const response = await fetch("https://api.example.com/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query }),
});

console.log(await response.json());