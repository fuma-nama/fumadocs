'use client';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input } from '@/ui/components/input';

export default function ServerSelect() {
  const { servers } = useApiContext();
  const { server, setServer, setServerVariables } = useServerSelectContext();

  if (servers.length <= 1) return null;

  const schema = server
    ? servers.find((item) => item.url === server.url)
    : undefined;

  return (
    <Collapsible className="-m-2 mt-2">
      <CollapsibleTrigger className="flex w-full flex-row items-center justify-between p-2 text-xs font-medium text-fd-muted-foreground">
        Configure Server
        <ChevronDown className="size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-4 p-2">
          <Select value={server?.url} onValueChange={setServer}>
            <SelectTrigger className="h-auto break-all">
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
