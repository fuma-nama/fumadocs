Look up a customer by its ID.

```graphql
type Query {
  customer(id: ID!): Customer
}
```

## Arguments

- `id` (`ID!`, required)

## Returns

`Customer`: A registered customer.

## Types

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

## Examples

### Customer With Orders

A customer with their latest orders.

- `first` limits the orders

```graphql
query CustomerWithOrders($id: ID!, $first: Int) {
  customer(id: $id) {
    name
    recent: orders(first: $first) {
      ...OrderFields
    }
  }
}

fragment OrderFields on Order {
  id
  total
  customer {
    ...CustomerFields
  }
}

fragment CustomerFields on Customer {
  id
  name
}
```

Variables:

```json
{
  "id": "cus_42",
  "first": 3
}
```

Response:

```json
{
  "data": {
    "customer": {
      "name": "string",
      "recent": [
        {
          "id": "1",
          "total": 10.5,
          "customer": {
            "id": "1",
            "name": "string"
          }
        }
      ]
    }
  }
}
```

### Customer Name

```graphql
query CustomerName($id: ID!) {
  customer(id: $id) {
    name
  }
}
```

Variables:

```json
{
  "id": "cus_42"
}
```

Response:

```json
{
  "data": {
    "customer": {
      "name": "string"
    }
  }
}
```