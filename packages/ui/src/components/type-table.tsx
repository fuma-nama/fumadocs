'use client';

import { InfoIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function Info({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Popover>
      <PopoverTrigger>
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="text-sm">{children}</PopoverContent>
    </Popover>
  );
}

type ObjectType = Record<
  string,
  {
    description?: string;
    type: string;
    typeDescription?: string;
    typeDescriptionLink?: string;
    default?: string;
  }
>;

export function TypeTable({ type }: { type: ObjectType }): JSX.Element {
  const th = cn('p-2 font-medium first:pl-0 last:pr-0');
  const td = cn('p-2 first:pl-0 last:pr-0');
  const field = cn('inline-flex flex-row items-center gap-1');
  const code = cn('rounded-md bg-secondary p-1 text-secondary-foreground');

  return (
    <div className="not-prose overflow-auto whitespace-nowrap">
      <table className="my-4 w-full text-left text-sm text-muted-foreground">
        <thead className="border-b">
          <tr>
            <th className={cn(th, 'w-[45%]')}>Prop</th>
            <th className={cn(th, 'w-[30%]')}>Type</th>
            <th className={cn(th, 'w-[25%]')}>Default</th>
          </tr>
        </thead>
        <tbody className="border-collapse divide-y divide-border">
          {Object.entries(type).map(([key, value]) => (
            <tr key={key}>
              <td className={td}>
                <div className={field}>
                  <code className={cn(code, 'bg-primary/10 text-primary')}>
                    {key}
                  </code>
                  {value.description ? <Info>{value.description}</Info> : null}
                </div>
              </td>
              <td className={td}>
                <div className={field}>
                  <code className={code}>{value.type}</code>
                  {value.typeDescription ? (
                    <Info>
                      <pre className="overflow-auto bg-secondary text-secondary-foreground">
                        {value.typeDescription}
                      </pre>
                    </Info>
                  ) : null}
                  {value.typeDescriptionLink ? (
                    <Link href={value.typeDescriptionLink}>
                      <InfoIcon className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </td>
              <td className={td}>
                {value.default ? (
                  <code className={code}>{value.default}</code>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
