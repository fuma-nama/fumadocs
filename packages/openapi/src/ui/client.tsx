'use client';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { cn, useCopyButton, buttonVariants } from 'fumadocs-ui/components/api';
import dynamic from 'next/dynamic';
import {
  ApiProvider,
  useApiContext,
  useServerSelectContext,
} from '@/ui/contexts/api';
import { type RootProps } from '@/render/renderer';
import type { RenderContext } from '@/types';
import { Input } from '@/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { getUrl } from '@/utils/server-url';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';

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
    <Collapsible className="-m-2 mt-2">
      <CollapsibleTrigger className="flex w-full flex-row items-center justify-between p-2 text-xs font-medium">
        Configure Server
        <ChevronDown className="size-4 text-fd-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-4 p-2">
          <Select value={server?.url} onValueChange={setServer}>
            <SelectTrigger className="h-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {servers.map((item) => (
                <SelectItem key={item.url} value={item.url}>
                  {item.url}
                  <p className="text-start text-xs text-fd-muted-foreground">
                    {item.description}
                  </p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {Object.entries(schema?.variables ?? {}).map(([key, variable]) => {
            if (!server) return;
            const id = `fd_server_select_${key}`;

            return (
              <fieldset key={key} className="flex flex-col gap-1">
                <label
                  className="font-mono text-xs text-fd-foreground"
                  htmlFor={id}
                >
                  {key}
                </label>
                <p className="text-xs text-fd-muted-foreground empty:hidden">
                  {variable.description}
                </p>
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
                    <SelectTrigger id={id}>
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export { useSchemaContext } from './contexts/schema';
