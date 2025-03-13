'use client';
import { type SelectedServer, useApiContext } from '@/ui/contexts/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input, labelVariants } from '@/ui/components/input';
import type { HTMLAttributes } from 'react';
import { cn } from 'fumadocs-ui/components/api';

export default function ServerSelect({
  server,
  onServerChanged,
  onVariablesChanged,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  server: SelectedServer | null;
  onServerChanged: (value: string) => void;
  onVariablesChanged: (value: Record<string, string>) => void;
}) {
  const { servers } = useApiContext();

  if (servers.length <= 1) return null;

  const schema = server
    ? servers.find((item) => item.url === server.url)
    : null;

  return (
    <div {...props} className={cn('flex flex-col gap-4', props.className)}>
      <Select value={server?.url} onValueChange={onServerChanged}>
        <SelectTrigger className="break-all">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {servers.map((item) => (
            <SelectItem key={item.url} value={item.url}>
              {item.url}
              <p className="text-start text-fd-muted-foreground">
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
            <label className={cn(labelVariants())} htmlFor={id}>
              {key}
            </label>
            <p className="text-xs text-fd-muted-foreground empty:hidden">
              {variable.description}
            </p>
            {variable.enum ? (
              <Select
                value={server.variables[key]}
                onValueChange={(v) =>
                  onVariablesChanged({
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
                  onVariablesChanged({
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
  );
}
