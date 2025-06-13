import type { Route } from './+types/home';
import { i18n } from '~/i18n';
import { Link } from 'react-router';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export default function Home(props: Route.ComponentProps) {
  const { lang = i18n.defaultLanguage } = props.params;

  return (
    <HomeLayout
      nav={{
        title: 'Fumadocs React Router',
      }}
      i18n={i18n}
      className="items-center justify-center gap-4"
    >
      <h1 className="font-mono text-lg font-medium">locale: {lang}</h1>
      <Link
        to="/docs"
        className={cn(
          buttonVariants({
            color: 'primary',
          }),
        )}
      >
        Open Docs
      </Link>
    </HomeLayout>
  );
}
