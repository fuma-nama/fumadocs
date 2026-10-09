use reqwest::{Client, Method, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let client = Client::new();

  let url = "http://localhost:8080/hello_world?search=ai";
  let body = reqwest::multipart::Form::new()
    .text("name", "Mars")
    .text("image", "@mars.jpg");

  let res = client
    .request(Method::POST, url)
    .header("authorization", "Bearer")
    .header("if-none-match", "\"etag\"")
    .header("Cookie", "mode=light")
    .multipart(body)
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}