import type { LoaderFunction } from "react-router";
import { source } from '../../source';
import { Suspense, lazy } from 'react';

const DocsContent = lazy(() => import('./docs-content'));

export const loader: LoaderFunction = async ({ params }) => {
  const slug = params['*'] || '';
  const slugs = slug.split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  
  if (!page) {
    throw new Response('Not found', { status: 404 });
  }

  return {
    path: page.path,
    title: page.data.title,
    description: page.data.description,
  };
};

export default function DocsRoute({ loaderData }: { 
  loaderData: { 
    path: string; 
    title: string; 
    description: string;
  } 
}) {
  const { title, description, path } = loaderData;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <article className="prose prose-gray max-w-none">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            {description && (
              <p className="text-xl text-gray-600 mb-6">{description}</p>
            )}
          </header>
          
          <div className="prose-content">
            <Suspense fallback={<div className="p-4 animate-pulse bg-gray-100 rounded">Loading content...</div>}>
              <DocsContent path={path} />
            </Suspense>
          </div>
        </article>
      </div>
    </main>
  );
}