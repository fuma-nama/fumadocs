import { blog } from '@/utils/source';
import Link from 'next/link';

export default function Page() {
  const posts = blog.getPages();

  const svg = `<svg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'>
  <filter id='noiseFilter'>
    <feTurbulence 
      type='fractalNoise' 
      baseFrequency='0.65' 
      numOctaves='3' 
      stitchTiles='stitch'/>
  </filter>
  
  <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
</svg>`;

  return (
    <main className="container max-sm:px-0 md:py-12">
      <div
        className="p-8 h-[300px] md:h-[400px] md:p-12"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 70% 10%, rgba(255,50,100,0.5), transparent)',
            'radial-gradient(circle at 0% 80%, rgba(190,0,255,0.5), transparent)',
            'radial-gradient(circle at 50% 50%, rgba(50,50,255,0.3), transparent)',
            `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
          ].join(', '),
        }}
      >
        <h1 className="font-bold text-4xl pb-2 border-b-4 border-foreground mb-4 md:text-5xl">
          Fumadocs Blog
        </h1>
        <p>Light and gorgeous. like the moon</p>
      </div>
      <div className="grid grid-cols-1 gap-2 border md:grid-cols-3 lg:grid-cols-4">
        {posts.map((post) => (
          <Link
            key={post.url}
            href={post.url}
            className="block p-4 bg-card hover:bg-accent"
          >
            <p className="font-medium">{post.data.title}</p>
            <p className="text-sm text-muted-foreground">
              {post.data.description}
            </p>

            <p className="text-xs mt-4 text-muted-foreground">
              {new Date(post.data.date ?? post.file.name).toDateString()}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
