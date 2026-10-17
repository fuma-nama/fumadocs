use reqwest::{Client, Result};
use serde_json::json;

const QUERY: &str = r#"query Orders {
  orders {
    id
  }
}"#;

#[tokio::main]
async fn main() -> Result<()> {
  let res = Client::new()
    .post("https://api.example.com/graphql")
    .json(&json!({ "query": QUERY }))
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}