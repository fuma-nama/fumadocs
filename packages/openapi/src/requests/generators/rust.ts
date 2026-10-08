import { cookieString, doubleQuote, indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';

export const rust: CodeUsageGenerator = {
  label: 'Rust',
  lang: 'rust',
  generate(data, { mediaAdapters }) {
    const body = generateBodyExample(data, mediaAdapters, { lang: 'rust' });
    const request = [`.request(Method::${data.method.toUpperCase()}, url)`];

    for (const k in data.header) {
      request.push(`.header(${doubleQuote(k)}, ${doubleQuote(data.header[k].value)})`);
    }

    const cookie = cookieString(data.cookie);
    if (cookie) request.push(`.header("Cookie", ${doubleQuote(cookie)})`);
    if (body && data.bodyMediaType === 'multipart/form-data') {
      request.push('.multipart(body)');
    } else if (body) {
      request.push(`.header("Content-Type", ${doubleQuote(data.bodyMediaType!)})`, '.body(body)');
    }
    request.push('.send()', '.await?', '.text()', '.await?;');

    return `use reqwest::{Client, Method, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let client = Client::new();

  let url = ${doubleQuote(data.url)};
${body ? `${indent(body)}\n` : ''}
  let res = client
${indent(request.join('\n'), 2)}

  println!("{}", res);
  Ok(())
}`;
  },
};
