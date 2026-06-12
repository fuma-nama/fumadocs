'use client';
import { createOpenAPIPage, type OpenAPIPageProps, type CreateOpenAPIPageOptions } from '.';

/** @deprecated Use `CreateOpenAPIPageOptions` insteawd */
export type CreateClientAPIPageOptions = CreateOpenAPIPageOptions;

/** @deprecated Use `OpenAPIPageProps` instead */
export type ClientApiPageProps = OpenAPIPageProps;

/** @deprecated use `createOpenAPIPage()` from `fumadocs-openapi/ui` instead */
export const createClientAPIPage = createOpenAPIPage;
