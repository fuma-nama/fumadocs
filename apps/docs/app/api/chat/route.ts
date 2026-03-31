import { handler } from '@/lib/inkeep/route';

export function POST(req: Request) {
  return handler.handler(req, {});
}
