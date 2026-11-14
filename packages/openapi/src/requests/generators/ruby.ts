import { rubyString } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/requests/generators';
import { generateBodyExample } from '@/requests/media/adapter';
import { cookieString, toSearchParams } from '@/requests/string-utils';

export const ruby: CodeUsageGenerator = {
  label: 'Ruby',
  lang: 'ruby',
  generate(data, { mediaAdapters }) {
    // Net::HTTP has a request class per method, like `Net::HTTP::Post`
    const method = data.method[0].toUpperCase() + data.method.slice(1).toLowerCase();
    const s = [`uri = URI(${rubyString(data.url)})`];
    const request = [`request = Net::HTTP::${method}.new(uri)`];

    for (const k in data.header) {
      request.push(`request[${rubyString(k)}] = ${rubyString(data.header[k].value)}`);
    }

    const cookie = cookieString(data.cookie);
    if (cookie) request.push(`request['Cookie'] = ${rubyString(cookie)}`);

    if (data.body && data.bodyMediaType === 'multipart/form-data') {
      // `set_form` writes the boundary, a key repeats for each item of an array
      const fields = Array.from(
        toSearchParams(data.body),
        ([key, value]) => `  [${rubyString(key)}, ${rubyString(value)}],`,
      );
      request.push(`request.set_form([\n${fields.join('\n')}\n], 'multipart/form-data')`);
    } else {
      const body = generateBodyExample(data, mediaAdapters, { lang: 'ruby' });
      if (body) {
        s.push(body);
        request.push(
          `request['Content-Type'] = ${rubyString(data.bodyMediaType!)}`,
          'request.body = body',
        );
      }
    }

    return `require 'net/http'

${s.join('\n')}
${request.join('\n')}

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
  http.request(request)
end

puts response.body`;
  },
};
