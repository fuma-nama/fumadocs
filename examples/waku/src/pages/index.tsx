import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Link } from 'waku';

export default function Home() {
  return (
    <HomeLayout
      nav={{
        title: 'Tanstack Start',
      }}
      className="text-center py-32 justify-center"
    >
      <h1 className="font-medium text-xl mb-4">Fumadocs on Waku.</h1>
      <Link
        to="/docs"
        className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
      >
        Open Docs
      </Link>
    </HomeLayout>
  );
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
