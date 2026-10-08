use reqwest::{Client, Method, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let client = Client::new();

  let url = "http://localhost:8080/hello_world?search=ai";
  let body = r#"{
    "id": "id",
    "note": "it's \"quoted\" \\ `a` ${b}"
  }"#;

  let res = client
    .request(Method::GET, url)
    .header("authorization", "Bearer")
    .header("if-none-match", "\"etag\"")
    .header("Cookie", "mode=light")
    .header("Content-Type", "application/json")
    .body(body)
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}