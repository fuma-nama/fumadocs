import { createRenderedDocuments } from 'shared-api/utils/rendered-documents';

/** the SDL of schemas left out of page props (`includeSchema: false`) */
export const renderedSchemas = createRenderedDocuments<string>('graphqlPlugin');
