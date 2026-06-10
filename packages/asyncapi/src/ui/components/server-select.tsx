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
import { useRef, useState, type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@fumadocs/api-docs/components/dialog';
import { StfProvider, useFieldValue, useListener, useStf } from '@fumari/stf';
import { EditIcon } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import type { NoReference } from '@fumadocs/api-docs/schema';
import type { ServerVariableObject } from '@/types';
import { resolveServerUrl } from '@/utils/server-url';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';

export function ServerSelect(props: ComponentProps<typeof DialogTrigger>) {
  const { servers, server, setServer, setServerVariables } = useServerContext();
  const [open, setOpen] = useState(false);
  const t = useTranslations({ note: 'playground server select' });
  const serverSchema = server ? servers[server.id] : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        {...props}
        className={cn(
          'flex items-center gap-2 text-sm text-start px-3 py-2 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
          props.className,
        )}
      >
        <span className="px-2 py-0.5 font-medium rounded-lg border bg-fd-primary text-xs text-fd-primary-foreground shadow-sm">
          {server ? idToTitle(server.id) : t('Server URL')}
        </span>
        <code className="truncate min-w-0 flex-1">
          {serverSchema && resolveServerUrl(serverSchema, server?.variables ?? {})}
        </code>
        <EditIcon className="size-4 text-fd-muted-foreground shrink-0" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Server URL')}</DialogTitle>
          <DialogDescription>{t('The base URL of your API endpoint.')}</DialogDescription>
        </DialogHeader>
        <Select value={server?.id} onValueChange={setServer}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(servers).map(([id, item]) => {
              return (
                <SelectItem key={id} value={id}>
                  <div className="flex flex-col gap-2">
                    <code className="font-medium">{resolveServerUrl(item, {})}</code>
                    {item.description && (
                      <p className="text-fd-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {server?.variables && serverSchema?.variables && (
          <ServerSelectContent
            key={server.id}
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
  schema: Record<string, NoReference<ServerVariableObject>>;
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
        200,
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

function Field({
  fieldName,
  variable,
}: {
  variable: NoReference<ServerVariableObject>;
  fieldName: string;
}) {
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
            <SelectItem key={value} value={String(value)}>
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
