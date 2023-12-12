/* eslint-disable */

// Automatically add changeset for create-next-docs-app
const { writeFileSync, existsSync } = require('fs');
const path = require('path');
const dir = path.resolve(process.cwd(), '.changeset');
if (!existsSync(dir)) throw new Error("Can't find changeset folder");

const content = `---
'create-next-docs-app': patch
---

Update Examples`;

writeFileSync(path.resolve(dir, 'create-next-docs-app.md'), content);

console.log('Added changeset automatically');
