import { LinkIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/utils/cn';

type Types = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingProps<T extends Types> = Omit<ComponentPropsWithoutRef<T>, 'as'> & {
  as?: T;
};

export function Heading<T extends Types = 'h1'>({
  as,
  className,
  ...props
}: HeadingProps<T>): React.ReactElement {
  const As = as ?? 'h1';

  return (
    <As className={cn('scroll-m-20', className)} {...props}>
      {props.id ? (
        <a href={`#${props.id}`} className="not-prose group">
          {props.children}
          <LinkIcon
            aria-label="Link to section"
            className="ml-2 inline size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </a>
      ) : (
        props.children
      )}
    </As>
  );
}
