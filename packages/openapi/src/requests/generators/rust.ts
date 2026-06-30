import { doubleQuote, indent } from '@/requests/string-utils';
import type { CodeUsageGenerator } from '@/requests/generators';
import { MediaContext, resolveMediaAdapter } from '@/requests/media/adapter';

export const rust: CodeUsageGenerator = {
  label: 'Rust',
  lang: 'rust',
  generate(data, { mediaAdapters }) {
    const headers = new Map<string, string>();

    for (const header in data.header) {
      headers.set(header, doubleQuote(data.header[header].value));
    }

    const cookies = Object.entries(data.cookie);
    if (cookies.length > 0) {
      headers.set(
        'Cookie',
        doubleQuote(cookies.map(([k, param]) => `${k}=${param.value}`).join('; ')),
      );
    }

    let body: string | undefined;

    if (data.body && data.bodyMediaType) {
      const adapter = resolveMediaAdapter(data.bodyMediaType, mediaAdapters);
      headers.set('Content-Type', `"${data.bodyMediaType}"`);
      body = adapter?.generateExample(data as { body: unknown }, { lang: 'rust' } as MediaContext);
    }

    return `use reqwest::{Result, Client};

async fn main() -> Result<()> {
  let client = Client::new();

  let url = "${data.url}";
${body ? indent(body) + '\n' : ''}
  let res = client
    .${data.method.toLowerCase()}(url)
${
  headers.size <= 0
    ? ''
    : indent(
        Array.from(headers.entries())
          .map(([key, value]) => `  .header("${key}", ${value})`)
          .join('\n'),
      ) + '\n'
}    .send()
    .await?
    .text()
    .await?;

  println!("{}", res);
  Ok(())
}`;
  },
};
