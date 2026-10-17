use reqwest::{Client, Result};
use serde_json::json;

const QUERY: &str = r###"# `backticks` ${x} $HOME !bang 'single' "double" \ "# "##
query Tricky($text: String! = "say \"hi\" \\ ${x}") {
  echo(text: "日本語 🎉 \n é 'single' `tick` $HOME !bang")
  block: echo(text: """
    "quoted" \""" escaped, \"""" four quotes, "#"## end with a quote "
  """)
  empty: echo(text: """""")
}
# ends with a quote ""###;

#[tokio::main]
async fn main() -> Result<()> {
  let res = Client::new()
    .post("https://api.example.com/graphql")
    .header("X-Tricky", "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#")
    .json(&json!({
      "query": QUERY,
      "variables": {
        "text": "q\"uote 'single' \\ `tick` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
        "large": 2147483648i64,
        "list": [
          true,
          null,
          10.5
        ]
      }
    }))
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}