import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function createCache() {
  const dir = path.join(process.cwd(), '.next/fumadocs-typescript');

  return {
    write(input: string, data: unknown) {
      const hash = createHash('SHA256')
        .update(input)
        .digest('hex')
        .slice(0, 12);

      fs.writeFileSync(path.join(dir, `${hash}.json`), JSON.stringify(data));
    },
    read(input: string): unknown | undefined {
      const hash = createHash('SHA256')
        .update(input)
        .digest('hex')
        .slice(0, 12);

      try {
        return JSON.parse(
          fs.readFileSync(path.join(dir, `${hash}.json`)).toString(),
        );
      } catch {
        return;
      }
    },
  };
}
