import { notFound } from 'next/navigation';

/** URLs that match no page: their 404 renders in the root layout, like the 404 of any page */
export default function Page() {
  notFound();
}
