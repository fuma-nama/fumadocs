import { Link } from 'waku';
import { i18n } from '@/lib/i18n';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <h1 className="font-medium text-xl mb-4">Fumadocs on Waku.</h1>
      <Link
        to="/en/docs"
        className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
      >
        Open Docs
      </Link>
    </div>
  );
}

export const getConfig = async () => {
  const paths = i18n.languages.map((lang) => [lang]);

  return {
    render: 'static',
    staticPaths: paths,
  };
};
