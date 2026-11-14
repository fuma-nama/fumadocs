import Link from 'fumadocs-core/link';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 p-8 [grid-area:main]">
      <h1 className="text-4xl font-bold font-mono">Not Found</h1>
      <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
        Return to Home
      </Link>
    </div>
  );
}
