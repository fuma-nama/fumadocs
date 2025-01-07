'use client';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, useCopyButton, buttonVariants } from 'fumadocs-ui/components/api';
import dynamic from 'next/dynamic';
import {
  ApiProvider,
  useApiContext,
  useServerSelectContext,
} from '@/ui/contexts/api';
import { type RootProps } from '@/render/renderer';
import type { RenderContext } from '@/types';
import { labelVariants } from '@/ui/components/form';
import { Input } from '@/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { getUrl } from '@/utils/server-url';

export const APIPlayground = dynamic(() =>
  import('./playground').then((mod) => mod.APIPlayground),
);

export function Root({
  children,
  baseUrl,
  className,
  shikiOptions,
  servers,
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
      <ApiProvider
        servers={servers}
        shikiOptions={shikiOptions}
        defaultBaseUrl={baseUrl}
      >
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
  const { serverRef } = useApiContext();

  const [checked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(
      `${serverRef.current ? getUrl(serverRef.current.url, serverRef.current.variables) : ''}${route}`,
    );
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

export function ServerSelect() {
  const { servers } = useApiContext();
  const { server, setServer, setServerVariables } = useServerSelectContext();

  if (servers.length <= 1) return null;

  const schema = server
    ? servers.find((item) => item.url === server.url)
    : undefined;

  return (
    <>
      <div className="not-prose mt-4 flex flex-row items-center gap-2">
        <span className="text-xs font-medium">Server</span>
        <select
          value={server?.url}
          onChange={(e) => setServer(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xs text-fd-foreground outline-none"
        >
          {servers.map((item) => (
            <option key={item.url} value={item.url}>
              {item.url}
            </option>
          ))}
        </select>
      </div>
      {schema && schema.variables && server?.variables ? (
        <div className="not-prose mt-2 flex flex-col gap-4">
          {schema.description ? (
            <p className="text-xs">{schema.description}</p>
          ) : null}
          {Object.entries(schema.variables).map(([key, variable]) => {
            const id = `fd_server_select_${key}`;

            return (
              <fieldset key={key} className="flex flex-col gap-1">
                <label className={cn(labelVariants())} htmlFor={id}>
                  {key}
                </label>
                <p className="text-xs">{variable.description}</p>
                {variable.enum ? (
                  <Select
                    value={server.variables[key]}
                    onValueChange={(v) =>
                      setServerVariables({
                        ...server?.variables,
                        [key]: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variable.enum.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    value={server.variables[key]}
                    onChange={(e) =>
                      setServerVariables({
                        ...server?.variables,
                        [key]: e.target.value,
                      })
                    }
                  />
                )}
              </fieldset>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

export { useSchemaContext } from './contexts/schema';
