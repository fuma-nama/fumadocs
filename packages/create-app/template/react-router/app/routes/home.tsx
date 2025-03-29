import type { Route } from './+types/home';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Link } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  return (
    <HomeLayout
      className="text-center"
      nav={{
        title: 'React Router',
      }}
    >
      <div className="py-12">
        <h1 className="text-xl font-bold mb-2">Fumadocs on React Router.</h1>
        <p className="text-fd-muted-foreground mb-8">
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
