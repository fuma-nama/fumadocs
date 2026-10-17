## Customer

Look up a customer by its ID.

```graphql
type Query {
  customer(id: ID!): Customer
}
```

### Arguments

- `id` (`ID!`, required)

### Returns

`Customer`: A registered customer.

### Types

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

### Examples

#### Customer With Orders

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

#### Customer Name

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

## Orders

List all orders.

```graphql
type Query {
  orders(filter: OrderFilter): [Order!]!
}
```

### Arguments

- `filter` (`OrderFilter`)

### Returns

`[Order!]!`: A customer's order.

### Types

```graphql
"A customer's order."
type Order implements Node @auth(requires: USER) {
  id: ID!
  status: OrderStatus!
  "Time at which the order was created."
  createdAt: DateTime!
  total: Float!
  customer: Customer!
}

"Filters for the `orders` query."
input OrderFilter {
  "Match orders created after this time."
  after: DateTime
  status: OrderStatus = PENDING
}
```

### Example

#### Dashboard

Search results with the pending orders.

```graphql
query Dashboard($term: String!, $filter: OrderFilter) {
  __typename
  search(term: $term) {
    ...SearchFields
  }
  pending: orders(filter: $filter) {
    id
  }
}

fragment SearchFields on SearchResult {
  __typename
  ... on Order {
    status
  }
  ... on Customer {
    name
  }
}
```

Variables:

```json
{
  "term": "string"
}
```

Response:

```json
{
  "data": {
    "__typename": "Query",
    "search": [
      {
        "__typename": "Order",
        "status": "PENDING"
      }
    ],
    "pending": [
      {
        "id": "1"
      }
    ]
  }
}
```

## Search

Search for customers and orders.

```graphql
type Query {
  search(term: String!): [SearchResult!]!
}
```

### Arguments

- `term` (`String!`, required)

### Returns

`[SearchResult!]!`

### Types

```graphql
union SearchResult = Customer | Order
```

### Example

#### Dashboard

Search results with the pending orders.

```graphql
query Dashboard($term: String!, $filter: OrderFilter) {
  __typename
  search(term: $term) {
    ...SearchFields
  }
  pending: orders(filter: $filter) {
    id
  }
}

fragment SearchFields on SearchResult {
  __typename
  ... on Order {
    status
  }
  ... on Customer {
    name
  }
}
```

Variables:

```json
{
  "term": "string"
}
```

Response:

```json
{
  "data": {
    "__typename": "Query",
    "search": [
      {
        "__typename": "Order",
        "status": "PENDING"
      }
    ],
    "pending": [
      {
        "id": "1"
      }
    ]
  }
}
```

## Node

Fetch any node by ID.

```graphql
type Query {
  node(id: ID!): Node
}
```

### Arguments

- `id` (`ID!`, required)

### Returns

`Node`: An object with a globally unique ID.

### Types

```graphql
"An object with a globally unique ID."
interface Node {
  "A globally unique identifier."
  id: ID!
}
```

### Example

#### Node By Id

Any node by its ID, **as a customer**.

```graphql
query NodeById($id: ID!) {
  node(id: $id) {
    __typename
    id
    ... on Customer {
      name
    }
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
    "node": {
      "__typename": "Customer",
      "id": "1",
      "name": "string"
    }
  }
}
```

## Create Order

Create a new order.

```graphql
type Mutation {
  createOrder(input: OrderCreateInput!): Order!
}
```

### Arguments

- `input` (`OrderCreateInput!`, required)

### Returns

`Order!`: A customer's order.

### Types

```graphql
input OrderCreateInput {
  customerId: ID!
  "Total amount of the order."
  total: Float!
}
```

### Example

```graphql
mutation CreateOrder($input: OrderCreateInput!) {
  createOrder(input: $input) {
    id
    status
    createdAt
    total
    customer {
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
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "customerId": "1",
    "total": 10.5
  }
}
```

Response:

```json
{
  "data": {
    "createOrder": {
      "id": "1",
      "status": "PENDING",
      "createdAt": "<DateTime>",
      "total": 10.5,
      "customer": {
        "id": "1",
        "name": "string",
        "contact": {
          "email": "string",
          "phone": "string"
        },
        "orders": [
          {
            "id": "1",
            "status": "PENDING",
            "createdAt": "<DateTime>",
            "total": 10.5
          }
        ]
      }
    }
  }
}
```

## Legacy Create Order

Deprecated: Use `createOrder` instead.

```graphql
type Mutation {
  legacyCreateOrder(customerId: ID!): Order
}
```

### Arguments

- `customerId` (`ID!`, required)

### Returns

`Order`: A customer's order.

### Example

```graphql
mutation LegacyCreateOrder($customerId: ID!) {
  legacyCreateOrder(customerId: $customerId) {
    id
    status
    createdAt
    total
    customer {
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
      }
    }
  }
}
```

Variables:

```json
{
  "customerId": "1"
}
```

Response:

```json
{
  "data": {
    "legacyCreateOrder": {
      "id": "1",
      "status": "PENDING",
      "createdAt": "<DateTime>",
      "total": 10.5,
      "customer": {
        "id": "1",
        "name": "string",
        "contact": {
          "email": "string",
          "phone": "string"
        },
        "orders": [
          {
            "id": "1",
            "status": "PENDING",
            "createdAt": "<DateTime>",
            "total": 10.5
          }
        ]
      }
    }
  }
}
```

## Order Updated

Subscribe to status changes of an order.

```graphql
type Subscription {
  orderUpdated(id: ID!): Order!
}
```

### Arguments

- `id` (`ID!`, required)

### Returns

`Order!`: A customer's order.

### Example

```graphql
subscription OrderUpdated($id: ID!) {
  orderUpdated(id: $id) {
    id
    status
    createdAt
    total
    customer {
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
      }
    }
  }
}
```

Variables:

```json
{
  "id": "1"
}
```

Response:

```json
{
  "data": {
    "orderUpdated": {
      "id": "1",
      "status": "PENDING",
      "createdAt": "<DateTime>",
      "total": 10.5,
      "customer": {
        "id": "1",
        "name": "string",
        "contact": {
          "email": "string",
          "phone": "string"
        },
        "orders": [
          {
            "id": "1",
            "status": "PENDING",
            "createdAt": "<DateTime>",
            "total": 10.5
          }
        ]
      }
    }
  }
}
```