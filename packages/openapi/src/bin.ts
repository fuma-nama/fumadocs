#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { generate } from './generate';

const path = process.argv[2];
const output = process.argv[3];

void generate(path).then((res) => {
  writeFileSync(output, res);
  console.log(`Generated: ${res.length} characters`);
});
