import { createRenderedDocuments } from 'shared-api/utils/rendered-documents';
import type { AsyncAPIObject } from '@/types';

export const renderedDocuments = createRenderedDocuments<AsyncAPIObject>('asyncapiPlugin');
