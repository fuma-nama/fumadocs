import { createFileRoute, Link } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <HomeLayout
      nav={{
        title: 'Tanstack Start',
      }}
      className="text-center py-32"
    >
      <h1 className="font-medium text-xl mb-4">Fumadocs on Tanstack Start.</h1>
      <Link
        to="/docs/$"
        className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
      >
        Open Docs
      </Link>
    </HomeLayout>
  );
}
