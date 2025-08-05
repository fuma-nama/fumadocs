import { Link } from 'react-router';
import { HomeLayout } from '@/home/client';

export default function Home() {
  return (
    <HomeLayout
      nav={{
        title: 'React Router',
      }}
    >
      <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
        <h1 className="text-xl font-bold mb-2">Fumadocs on React Router.</h1>
        <p className="text-fd-muted-foreground mb-4">
          The truly flexible docs framework on React.js.
        </p>
        <Link
          className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5"
          to="/docs"
        >
          Open Docs
        </Link>
      </div>
    </HomeLayout>
  );
}
