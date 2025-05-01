'use client';
import {
  type SelectedServer,
  useApiContext,
  useServerSelectContext,
} from '@/ui/contexts/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input, labelVariants } from '@/ui/components/input';
import { type HTMLAttributes, useState } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import { getUrl } from '@/utils/server-url';
import { FormProvider, useController, useForm } from 'react-hook-form';
import type { OpenAPIV3_1 } from 'openapi-types';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

export default function ServerSelect(props: HTMLAttributes<HTMLDivElement>) {
  const { servers } = useApiContext();
  const { server, setServer } = useServerSelectContext();
  const [open, setOpen] = useState(false);
  if (servers.length <= 0) return;

  const serverUrl = server
    ? getUrl(server.url, server.variables)
    : window.location.origin;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-xs p-3 py-2 bg-fd-muted text-fd-muted-foreground transition-colors truncate hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none">
        {serverUrl}
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
                {item.url}
                <p className="text-start text-fd-muted-foreground">
                  {item.description}
                </p>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {server && (
          <ServerSelectContent
            key={server.url}
            server={server}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServerSelectContent({
  server,
  onClose,
}: {
  server: SelectedServer;
  onClose: () => void;
}) {
  const { servers } = useApiContext();
  const { setServerVariables } = useServerSelectContext();
  const schema = servers.find((item) => item.url === server.url);
  const form = useForm({
    defaultValues: server.variables,
  });

  const onSubmit = form.handleSubmit((data) => {
    setServerVariables(data);
    onClose();
  });

  if (!schema?.variables) return;

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void onSubmit(e);
          e.stopPropagation();
        }}
      >
        {Object.entries(schema.variables).map(([key, variable]) => {
          return (
            <fieldset key={key} className="flex flex-col gap-1">
              <label className={cn(labelVariants())} htmlFor={key}>
                {key}
              </label>
              <p className="text-xs text-fd-muted-foreground empty:hidden">
                {variable.description}
              </p>
              <Field
                fieldName={key}
                variable={variable as OpenAPIV3_1.ServerVariableObject}
              />
            </fieldset>
          );
        })}
        <button
          type="submit"
          className={cn(
            buttonVariants({
              color: 'primary',
              className: 'mt-2',
            }),
          )}
        >
          Save
        </button>
      </form>
    </FormProvider>
  );
}

function Field({
  fieldName,
  variable,
}: {
  variable: OpenAPIV3_1.ServerVariableObject;
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
