import { watch } from 'node:fs';

await import('zshy');
const watcher = watch('src', { recursive: true }, async (event, filename) => {
  console.log(`Detected ${event} in ${filename}`);
  await import(`zshy?${Date.now()}`);
});

process.on('SIGINT', () => {
  watcher.close();
  process.exit(0);
});
