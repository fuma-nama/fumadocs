import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr';
import { renderToReadableStream as renderHTMLToReadableStream } from 'react-dom/server.edge';
import {
  unstable_routeRSCServerRequest as routeRSCServerRequest,
  unstable_RSCStaticRouter as RSCStaticRouter,
} from 'react-router';
import type { ReactFormState } from 'react-dom/client';

export async function generateHTML(request: Request, serverResponse: Response): Promise<Response> {
  return await routeRSCServerRequest({
    // The incoming request.
    request,
    // The React Server response
    serverResponse,
    // Provide the React Server touchpoints.
    createFromReadableStream,
    // Render the router to HTML.
    async renderHTML(getPayload) {
      const payload = await getPayload();

      const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent('index');

      return await renderHTMLToReadableStream(<RSCStaticRouter getPayload={getPayload} />, {
        bootstrapScriptContent,
        formState: 'formState' in payload ? (payload.formState as ReactFormState) : undefined,
      });
    },
  });
}
