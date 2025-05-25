'use client';

import { Info as InfoIcon } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { cvb } from '@/utils/cn';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ReactNode } from 'react';

export function Info({ children }: { children: ReactNode }): ReactNode {
  return (
    <Popover>
      <PopoverTrigger>
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="prose max-h-[400px] min-w-[220px] max-w-[400px] overflow-auto text-sm prose-no-margin">
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface ObjectType {
  /**
   * Additional description of the field
   */
  description?: ReactNode;
  type: string;
  typeDescription?: ReactNode;
  /**
   * Optional link to the type
   */
  typeDescriptionLink?: string;
  default?: string;

  required?: boolean;
  deprecated?: boolean;
}

const field = cvb({ base: 'inline-flex flex-row items-center gap-1' });
const code = cvb({
  base: 'rounded-md bg-fd-secondary p-1 text-fd-secondary-foreground',
  variants: {
    color: {
      primary: 'bg-fd-primary/10 text-fd-primary',
      deprecated: 'line-through text-fd-primary/50',
    },
  },
});

export function TypeTable({ type }: { type: Record<string, ObjectType> }) {
  return (
    <div className="prose my-6 overflow-auto prose-no-margin">
      <table className="whitespace-nowrap text-sm text-fd-muted-foreground">
        <thead>
          <tr>
            <th className="w-[45%]">Prop</th>
            <th className="w-[30%]">Type</th>
            <th className="w-1/4">Default</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(type)
            .sort((a) => (a[1].deprecated ? 1 : -1))
            .map(([key, value]) => (
              <tr key={key}>
                <td>
                  <div className={field()}>
                    <code
                      className={code({
                        color: value.deprecated ? 'deprecated' : 'primary',
                      })}
                    >
                      {key}
                      {!value.required && '?'}
                    </code>
                    {value.description ? (
                      <Info>{value.description}</Info>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div className={field()}>
                    <code className={code()}>{value.type}</code>
                    {value.typeDescription ? (
                      <Info>{value.typeDescription}</Info>
                    ) : null}
                    {value.typeDescriptionLink ? (
                      <Link href={value.typeDescriptionLink}>
                        <InfoIcon className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                </td>
                <td>
                  {value.default ? (
                    <code className={code()}>{value.default}</code>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
