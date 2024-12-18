import { openapi } from '@/lib/source';

export const { GET, HEAD, PUT, POST, PATCH, DELETE } = openapi.createProxy();
