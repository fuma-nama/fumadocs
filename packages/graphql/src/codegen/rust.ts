import { rustEscapedString, rustString } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const rust: CodeUsageGenerator = {
  label: 'Rust',
  lang: 'rust',
  generate({ url, query, variables, headers }) {
    let request = `Client::new()\n    .post(${JSON.stringify(url)})`;
    for (const name in headers) {
      request += `\n    .header(${JSON.stringify(name)}, ${JSON.stringify(headers[name])})`;
    }
    const body = variables
      ? `{\n      "query": QUERY,\n      "variables": ${json(variables).replaceAll('\n', '\n      ')}\n    }`
      : '{ "query": QUERY }';

    return `use reqwest::{Client, Result};
use serde_json::json;

const QUERY: &str = ${rustString(query)};

#[tokio::main]
async fn main() -> Result<()> {
  let res = ${request}
    .json(&json!(${body}))
    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}`;
  },
};

/** the `json!` literal of a JSON value */
function json(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/"(?:[^"\\]|\\.)*"|-?\d[\d.eE+-]*/g, (token) => {
    if (token[0] === '"') return rustEscapedString(JSON.parse(token)).replaceAll('\n', '\\n');
    // integer literals are `i32` by default
    const n = Math.abs(Number(token));
    if (n <= 2147483647 || /[.eE]/.test(token)) return token;
    return n < 2 ** 63 ? `${token}i64` : `${token}.0`;
  });
}
