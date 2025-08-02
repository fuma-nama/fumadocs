'use client';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input, labelVariants } from '@/ui/components/input';
import { type HTMLAttributes, useEffect, useState } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import { resolveServerUrl, withBase } from '@/utils/url';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import type { ServerVariableObject } from '@/types';

export default function ServerSelect(props: HTMLAttributes<HTMLDivElement>) {
  const { servers } = useApiContext();
  const { server, setServer, setServerVariables } = useServerSelectContext();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (servers.length <= 0) return;
  const serverSchema = server
    ? servers.find((obj) => obj.url === server.url)
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-xs p-3 py-2 bg-fd-muted text-fd-muted-foreground transition-colors truncate hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none">
        {isMounted
          ? withBase(
              server ? resolveServerUrl(server.url, server.variables) : '/',
              window.location.origin,
            )
          : 'loading...'}
      </DialogTrigger>
      <DialogContent {...props}>
        <DialogHeader>
          <DialogTitle>Server URL</DialogTitle>
          <DialogDescription>
            The base URL of your API endpoint.
          </DialogDescription>
        </DialogHeader>
        <Select value={server?.url} onValueChange={setServer}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {servers.map((item) => (
              <SelectItem key={item.url} value={item.url}>
                <code className="text-[13px]">{item.url}</code>
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
  const form = useForm({
    defaultValues,
  });

  const onChangeDebounced = useEffectEvent(onChange);
  useEffect(() => {
    let timer: number | null = null;

    return form.subscribe({
      formState: {
        values: true,
      },
      callback({ values }) {
        if (timer !== null) window.clearTimeout(timer);

        timer = window.setTimeout(() => onChangeDebounced(values), 500);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `form` shouldn't be included
  }, []);

  return (
    <FormProvider {...form}>
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
    </FormProvider>
  );
}

function Field({
  fieldName,
  variable,
}: {
  variable: ServerVariableObject;
  fieldName: string;
}) {
  const { field } = useController({
    name: fieldName,
  });

  if (variable.enum) {
    return (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger id={fieldName} ref={field.ref}>
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

  return <Input id={fieldName} {...field} />;
}
