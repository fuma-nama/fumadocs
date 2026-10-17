use reqwest::{Client, Result};
use serde_json::json;

const QUERY: &str = r#"query Customer($id: ID!) {
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
}"#;

#[tokio::main]
async fn main() -> Result<()> {
  let res = Client::new()
    .post("https://api.example.com/graphql")
    .header("Authorization", "Bearer <token>")
    .json(&json!({
      "query": QUERY,
      "variables": {
        "id": "1"
      }
    }))
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}