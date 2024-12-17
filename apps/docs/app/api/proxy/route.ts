import { openapi } from '@/app/source';

export const { GET, HEAD, PUT, POST, PATCH, DELETE } = openapi.createProxy();
