import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';
import { createConfigSchema } from './src/config';
import { z } from 'zod';

export default defineConfig({
  entry: ['./src/index.ts', './src/build/index.ts'],
  format: 'esm',
  dts: true,
  fixedExtension: false,
  target: 'node22',
  async onSuccess() {
    console.log('JSON schema generated');
    await fs.mkdir('dist/schema', { recursive: true });
    await fs.writeFile(
      'dist/schema/src.json',
      JSON.stringify(
        z.toJSONSchema(createConfigSchema(true), {
          io: 'input',
        }),
      ),
    );
    await fs.writeFile(
      'dist/schema/default.json',
      JSON.stringify(
        z.toJSONSchema(createConfigSchema(false), {
          io: 'input',
        }),
      ),
    );
  },
});
