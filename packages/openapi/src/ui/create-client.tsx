import { createOpenAPIPage, type CreateOpenAPIPageOptions } from '.';

/** @deprecated use `createOpenAPIPage()` from `fumadocs-openapi/ui` instead */
export function createClientAPIPage(options: CreateOpenAPIPageOptions) {
  return createOpenAPIPage(options);
}
