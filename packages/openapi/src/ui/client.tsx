'use client';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, useCopyButton, buttonVariants } from 'fumadocs-ui/components/api';
import dynamic from 'next/dynamic';
import { ApiProvider, useApiContext } from '@/ui/contexts/api';
import { type RootProps } from '@/render/renderer';
import { RenderContext } from '@/types';

export const APIPlayground = dynamic(() =>
  import('./playground').then((mod) => mod.APIPlayground),
);

export function Root({
  children,
  baseUrl,
  className,
  shikiOptions,
  ...props
}: RootProps & {
  shikiOptions: RenderContext['shikiOptions'];
} & HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ApiProvider shikiOptions={shikiOptions} defaultBaseUrl={baseUrl}>
        {children}
      </ApiProvider>
    </div>
  );
}

export function CopyRouteButton({
  className,
  route,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  route: string;
}): ReactNode {
  const { baseUrl } = useApiContext();

  const [checked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(`${baseUrl ?? ''}${route}`);
  });

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className,
        }),
      )}
      onClick={onCopy}
      aria-label="Copy route path"
      {...props}
    >
      {checked ? (
        <Check className="size-full" />
      ) : (
        <Copy className="size-full" />
      )}
    </button>
  );
}

export function BaseUrlSelect({ baseUrls }: { baseUrls: string[] }) {
  const { baseUrl, setBaseUrl } = useApiContext();

  if (baseUrls.length <= 1) return null;

  return (
    <div className="mt-2 flex flex-row items-center gap-1 px-1">
      <span className="p-0.5 text-xs font-medium text-fd-muted-foreground">
        Server
      </span>
      <select
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs text-fd-foreground outline-none"
      >
        {baseUrls.map((url) => (
          <option key={url} value={url}>
            {url}
          </option>
        ))}
      </select>
    </div>
  );
}

export { useSchemaContext } from './contexts/schema';
