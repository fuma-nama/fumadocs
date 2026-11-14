import fs from 'node:fs/promises';
import { asMarkdown } from 'fumadocs-core/server';
import { CopyButton } from './agent-instructions.client';

export async function AgentInstructions() {
  const instructions = await fs.readFile('./components/agent-instructions.md', 'utf-8');
  if (asMarkdown()) return instructions;

  return (
    <div className="p-3 border rounded-xl bg-fd-card text-fd-card-foreground my-4! text-sm not-prose">
      <p className="font-medium">Using an AI agent?</p>
      <p className="mt-1 mb-4 text-fd-muted-foreground">
        Give your agent (Claude Code, Cursor, Codex, etc.) the instructions to set up a docs site,
        write content and upgrade Fumadocs. Copy them, or link{' '}
        <a href="/agents.md" className="font-medium text-fd-foreground underline">
          fumadocs.dev/agents.md
        </a>
        .
      </p>

      <CopyButton text={instructions} />
    </div>
  );
}
