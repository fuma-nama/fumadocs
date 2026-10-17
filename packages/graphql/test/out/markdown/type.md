```graphql
"A registered customer."
type Customer implements Node {
  id: ID!
  "The customer's full name."
  name: String!
  "The customer's email address."
  email: String @deprecated(reason: "Use `contact` instead.")
  "Contact information of the customer."
  contact: ContactInfo
  "Orders placed by this customer."
  orders(
    "Include only orders with the given status."
    status: OrderStatus
    first: Int = 10
  ): [Order!]!
}
```

- Returned by: `Query.customer`
- Field of: `Order.customer`
- Member of: `SearchResult`