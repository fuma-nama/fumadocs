import { createFileRoute, Link } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/$lang/')({
  component: Home,
});

function Home() {
  const { lang } = Route.useParams();

  return (
    <HomeLayout
      {...baseOptions(lang)}
      className="text-center py-32 justify-center"
    >
      <h1 className="font-medium text-xl mb-4">Fumadocs on Tanstack Start.</h1>
      <Link
        to="/$lang/docs/$"
        params={{
          lang,
          _splat: '',
        }}
        className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
      >
        Open Docs
      </Link>
    </HomeLayout>
  );
}
