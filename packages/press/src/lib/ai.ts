import { getConfigRuntime } from '@/config/load-runtime';
import type { LanguageModel } from 'ai';

let cached: Promise<LanguageModel> | undefined;

export function defaultModelCached(): Promise<LanguageModel> {
  return (cached ??= defaultModel());
}

export async function defaultModel(): Promise<LanguageModel> {
  const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  return openrouter.chat(process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet');
}

export async function isAISupported() {
  const config = await getConfigRuntime();
  return config.ai?.createModel !== undefined || process.env.OPENROUTER_API_KEY !== undefined;
}
