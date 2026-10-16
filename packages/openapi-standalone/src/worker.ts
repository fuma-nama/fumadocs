import { workerData } from 'node:worker_threads';
import { renderToFiles } from './render';

await renderToFiles(...(workerData as Parameters<typeof renderToFiles>));
