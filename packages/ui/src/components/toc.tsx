import { TextIcon } from 'lucide-react';
import type { TOCItemType } from '@fuma-docs/core/server';
import * as Primitive from '@fuma-docs/core/toc';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';

type PosType = [top: number, height: number];

export function TOCItems({ items }: { items: TOCItemType[] }): JSX.Element {
  const { toc = 'On this page' } = useI18n().text;
  const [pos, setPos] = useState<PosType>();

  return (
    <Primitive.TOCProvider
      toc={items}
      className="relative overflow-hidden pt-4 text-sm first:pt-0"
    >
      <h3 className="mb-4 inline-flex items-center gap-2">
        <TextIcon className="size-4" />
        {toc}
      </h3>
      <div className="flex flex-col gap-1 border-l-2 text-muted-foreground">
        <div
          role="none"
          className={cn(
            'absolute left-0 border-l-2 transition-all',
            pos && 'border-primary',
          )}
          style={{
            top: pos?.[0],
            height: pos?.[1],
          }}
        />
        {items.map((item) => (
          <TOCItem key={item.url} item={item} setMarker={setPos} />
        ))}
      </div>
    </Primitive.TOCProvider>
  );
}

function TOCItem({
  item,
  setMarker,
}: {
  item: TOCItemType;
  setMarker: (v: PosType) => void;
}): JSX.Element {
  const active = Primitive.useActiveAnchor(item.url);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      setMarker([ref.current.offsetTop, ref.current.clientHeight]);
    }
  }, [active, setMarker]);

  return (
    <Primitive.TOCItem
      ref={ref}
      href={item.url}
      className={cn(
        'overflow-hidden text-ellipsis py-1 transition-colors data-[active=true]:font-medium data-[active=true]:text-primary',
        item.depth <= 2 && 'pl-4',
        item.depth === 3 && 'pl-7',
        item.depth >= 4 && 'pl-10',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
