import { OramaCloud } from '@orama/core';

export const DataSourceId = process.env
  .NEXT_PUBLIC_ORAMA_DATASOURCE_ID as string;

export const isAdmin = process.env.ORAMA_PRIVATE_API_KEY !== undefined;

export const orama = new OramaCloud({
  projectId: process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID as string,
  apiKey:
    process.env.ORAMA_PRIVATE_API_KEY ??
    (process.env.NEXT_PUBLIC_ORAMA_API_KEY as string),
});
