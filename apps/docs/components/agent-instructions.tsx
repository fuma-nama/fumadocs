import fs from 'node:fs/promises';
import { CopyButton } from './agent-instructions.client';

export async function AgentInstructions() {
  const instructions = await fs.readFile('./components/agent-instructions.md', 'utf-8');

  return (
    <div className="p-3 border rounded-xl bg-fd-card text-fd-card-foreground my-4! text-sm not-prose">
      <p className="font-medium">Using an AI agent?</p>
      <p className="mt-1 mb-4 text-fd-muted-foreground">
        Copy the setup instructions into your agent (Claude Code, Cursor, Codex, etc.), it will
        follow the recommended way to set up a docs site.
      </p>

      <CopyButton text={instructions} />
    </div>
  );
}
