import { openapi } from '@/lib/openapi';

export const { GET, HEAD, PUT, POST, PATCH, DELETE } = openapi.createProxy({
  // origins of the `servers` defined in `scalar.yaml`
  allowedOrigins: [
    'https://galaxy.scalar.com',
    'https://void.scalar.com',
    'http://void.scalar.com',
  ],
});
