import { exportSearchIndexes } from '@/lib/export-search-indexes';

export async function loader() {
  return Response.json(await exportSearchIndexes());
}
