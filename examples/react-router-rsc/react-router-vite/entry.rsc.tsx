import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc';
import { unstable_matchRSCServerRequest as matchRSCServerRequest } from 'react-router';

// Routes defined directly (instead of relying on complex file-based routing) for minimal example
const routes = [
  {
    path: '/',
    id: 'root',
    lazy: () => import('../app/root'),
    children: [
      {
        index: true,
        id: 'home',
        lazy: () => import('../app/routes/home'),
      },
    ],
  },
];

export default function handler(request: Request) {
  return matchRSCServerRequest({
    request,
    routes,
    createTemporaryReferenceSet,
    decodeAction,
    decodeFormState,
    decodeReply,
    loadServerAction,
    generateResponse(match, options) {
      return new Response(renderToReadableStream(match.payload, options), {
        status: match.statusCode,
        headers: match.headers,
      });
    },
  });
}
