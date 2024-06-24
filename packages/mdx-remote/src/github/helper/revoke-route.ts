import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export interface Message {
  path: string;
}

export function createRevokeAPI(): {
  POST: (req: NextRequest) => Promise<Response>;
} {
  return {
    async POST(req: NextRequest) {
      if (process.env.NODE_ENV !== 'development')
        return new NextResponse(
          'This route is only available on development mode',
          {
            status: 401,
          },
        );
      const body = (await req.json()) as Message;

      console.log('revoke', body.path);
      revalidatePath('/docs', 'layout');
      return new NextResponse('Successful');
    },
  };
}
