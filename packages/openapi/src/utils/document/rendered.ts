import { createRenderedDocuments } from 'shared-api/utils/rendered-documents';
import type { Document } from '@/types';

export const renderedDocuments = createRenderedDocuments<Document>('openapiPlugin');
