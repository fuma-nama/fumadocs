import { docsLlms } from '@/lib/llms';
import { i18n } from '@/lib/i18n';

export async function GET() {
  return (await docsLlms.serve('/llms.txt', i18n.defaultLanguage))!;
}
