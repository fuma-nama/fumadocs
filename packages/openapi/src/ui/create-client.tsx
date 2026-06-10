'use client';
import { createOpenAPIPage, type CreateOpenAPIPageOptions } from '.';

/** @deprecated Use `CreateOpenAPIPageOptions` insteawd */
export type CreateClientAPIPageOptions = CreateOpenAPIPageOptions;

/** @deprecated use `createOpenAPIPage()` from `fumadocs-openapi/ui` instead */
export const createClientAPIPage = createOpenAPIPage;
