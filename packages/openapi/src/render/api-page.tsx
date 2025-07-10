import { DocumentInput, processDocument } from '@/utils/process-document';
import { APIPageInner, ApiPageProps } from './api-page-inner';

export async function APIPage(
  props: ApiPageProps & { document: DocumentInput },
) {
  const { disableCache = process.env.NODE_ENV === 'development' } = props;
  const processed = await processDocument(props.document, disableCache);
  return <APIPageInner {...props} processed={processed} />;
}
