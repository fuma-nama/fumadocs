'use client';
import { useServerContext } from '@/ui/contexts/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fumadocs/api-docs/components/select';
import { Input, labelVariants } from '@fumadocs/api-docs/components/input';
import { useEffect, useState, useRef, type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@fumadocs/api-docs/components/dialog';
import type { ServerVariableObject } from '@/types';
import { StfProvider, useFieldValue, useListener, useStf } from '@fumari/stf';
import { EditIcon } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { resolveServerUrl } from '@fumadocs/api-docs/utils/url';

export default function ServerSelect(props: ComponentProps<typeof DialogTrigger>) {
  const { servers, server, setServer, setServerVariables } = useServerContext();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations({ note: 'playground server select' });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!servers || servers.length <= 0) return;
  const serverSchema = server ? servers.find((obj) => obj.url === server.url) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        {...props}
        className={cn(
          'flex items-center gap-2 text-sm text-start px-3 py-2 bg-fd-muted text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
          props.className,
        )}
      >
        <span className="px-2 py-0.5 -ms-2 font-medium rounded-lg border bg-fd-secondary text-fd-secondary-foreground shadow-sm">
          {server?.name ?? t('Server URL')}
        </span>
        <code className="truncate min-w-0 flex-1">
          {isMounted
            ? new URL(
                server ? resolveServerUrl(server.url, server.variables) : '/',
                window.location.origin,
              ).href
            : t('loading...')}
        </code>
        <EditIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Server URL')}</DialogTitle>
          <DialogDescription>{t('The base URL of your API endpoint.')}</DialogDescription>
        </DialogHeader>
        <Select
          items={servers.map((server) => ({
            value: server.url!,
            label: <code className="text-[0.8125rem]">{server.url}</code>,
          }))}
          value={server?.url ?? null}
          onValueChange={(v) => v !== null && setServer(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {servers.map((item) => (
              <SelectItem key={item.url} value={item.url!}>
                <code className="text-[0.8125rem]">{item.url}</code>
                <p className="text-fd-muted-foreground">{item.description}</p>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {server?.variables && serverSchema?.variables && (
          <ServerSelectContent
            key={server.url}
            defaultValues={server.variables}
            schema={serverSchema.variables}
            onChange={setServerVariables}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServerSelectContent({
  defaultValues,
  onChange,
  schema,
}: {
  defaultValues: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  schema: Record<string, ServerVariableObject>;
}) {
  const stf = useStf({
    defaultValues: () => structuredClone(defaultValues),
  });
  const timerRef = useRef<number | null>(null);
  useListener({
    stf,
    onUpdate() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(
        () => onChange(stf.dataEngine.getData() as Record<string, string>),
        500,
      );
    },
  });

  return (
    <StfProvider value={stf}>
      <div className="flex flex-col gap-4">
        {Object.entries(schema).map(([key, variable]) => {
          return (
            <fieldset key={key} className="flex flex-col gap-1">
              <label className={cn(labelVariants())} htmlFor={key}>
                {key}
              </label>
              <p className="text-xs text-fd-muted-foreground empty:hidden">
                {variable.description}
              </p>
              <Field fieldName={key} variable={variable} />
            </fieldset>
          );
        })}
      </div>
    </StfProvider>
  );
}

function Field({ fieldName, variable }: { variable: ServerVariableObject; fieldName: string }) {
  const t = useTranslations({ note: 'playground server select' });
  const [value, setValue] = useFieldValue([fieldName], {
    compute(currentValue) {
      return typeof currentValue === 'string' ? currentValue : undefined;
    },
  });

  if (variable.enum) {
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={fieldName}>
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
    );
  }

  return (
    <Input
      id={fieldName}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={t('Enter Value')}
    />
  );
}
