'use client';
import {
  type ReactElement,
  type HTMLAttributes,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import useSWRImmutable from 'swr/immutable';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import type {
  FieldPath,
  UseFormStateReturn,
  ControllerFieldState,
  ControllerRenderProps,
} from 'react-hook-form';
import { useApiContext } from '@/ui/contexts/api';
import { Form } from '@/ui/components/form';
import { createBodyFromValue, getStatusInfo } from '@/ui/api/fetcher';
import { getDefaultValue, getDefaultValues } from '@/ui/api/get-default-values';
import { InputField, ObjectInput } from '@/ui/inputs';
import type {
  APIPlaygroundProps,
  PrimitiveRequestField,
  RequestSchema,
} from '@/render/playground';
import { CodeBlock } from '@/ui/components/codeblock';
import { type DynamicField, SchemaContext } from './contexts/schema';

interface FormValues {
  authorization: string;
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  body: unknown;
}

export interface CustomField<TName extends FieldPath<FormValues>, Info> {
  render: (props: {
    /**
     * Field Info
     */
    info: Info;
    field: ControllerRenderProps<FormValues, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<FormValues>;
  }) => ReactElement;
}

export function APIPlayground({
  route,
  method = 'GET',
  bodyType,
  authorization,
  path = [],
  header = [],
  query = [],
  body,
  fields = {},
  schemas,
}: APIPlaygroundProps & {
  fields?: {
    auth?: CustomField<'authorization', PrimitiveRequestField>;
    path?: CustomField<`path.${string}`, PrimitiveRequestField>;
    query?: CustomField<`query.${string}`, PrimitiveRequestField>;
    header?: CustomField<`header.${string}`, PrimitiveRequestField>;
    body?: CustomField<'body', RequestSchema>;
  };
} & HTMLAttributes<HTMLFormElement>): React.ReactElement {
  const { baseUrl } = useApiContext();
  const dynamicRef = useRef(new Map<string, DynamicField>());
  const [input, setInput] = useState<FormValues>();
  const form = useForm<FormValues>({
    defaultValues: {
      authorization: authorization?.defaultValue,
      path: getDefaultValues(path, schemas),
      query: getDefaultValues(query, schemas),
      header: getDefaultValues(header, schemas),
      body: body ? getDefaultValue(body, schemas) : undefined,
    },
  });

  const testQuery = useSWRImmutable(
    input ? [baseUrl, route, method, input, bodyType] : null,
    async () => {
      if (!input) return;

      const url = new URL(
        `${baseUrl ?? window.location.origin}${createPathnameFromInput(route, input.path)}`,
      );
      Object.keys(input.query).forEach((key) => {
        const paramValue = input.query[key];
        if (typeof paramValue === 'string' && paramValue.length > 0)
          url.searchParams.append(key, paramValue);
      });

      const headers = new Headers({
        'Content-Type': 'application/json',
      });

      if (input.authorization) {
        headers.append('Authorization', input.authorization);
      }

      Object.keys(input.header).forEach((key) => {
        const paramValue = input.header[key];

        if (typeof paramValue === 'string' && paramValue.length > 0)
          headers.append(key, paramValue);
      });

      const bodyValue =
        body && input.body && Object.keys(input.body).length > 0
          ? createBodyFromValue(
              bodyType,
              input.body,
              body,
              schemas,
              dynamicRef.current,
            )
          : undefined;
      const response = await fetch(url, {
        method,
        headers,
        body: bodyValue,
      });

      const data: unknown = await response.json().catch(() => undefined);

      return { status: response.status, data };
    },
    {
      shouldRetryOnError: false,
    },
  );

  const onSubmit = form.handleSubmit((value) => {
    setInput(value);
  });

  function renderCustomField<
    T extends FieldPath<FormValues>,
    F extends RequestSchema & { name?: string },
  >(
    fieldName: T,
    info: F,
    field: CustomField<T, F> | undefined,
    key?: string,
  ): ReactElement {
    if (field) {
      return (
        <Controller
          key={key}
          control={form.control}
          render={(props) => field.render({ ...props, info })}
          name={fieldName}
        />
      );
    }

    return (
      <InputField
        key={key}
        name={info.name}
        fieldName={fieldName}
        field={info}
      />
    );
  }

  return (
    <Form {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          className="not-prose flex flex-col gap-5 rounded-lg border bg-fd-card p-4"
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <div className="flex flex-row gap-2">
            <RouteDisplay route={route} />
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'secondary' }))}
              disabled={testQuery.isLoading}
            >
              Send
            </button>
          </div>

          {authorization
            ? renderCustomField('authorization', authorization, fields.auth)
            : null}
          <Accordions
            type="multiple"
            className={cn(
              '-m-4 border-0 text-sm',
              path.length === 0 &&
                query.length === 0 &&
                header.length === 0 &&
                !body &&
                'hidden',
            )}
          >
            {path.length > 0 ? (
              <Accordion title="Path">
                <div className="flex flex-col gap-4">
                  {path.map((field) =>
                    renderCustomField(
                      `path.${field.name}`,
                      field,
                      fields.path,
                      field.name,
                    ),
                  )}
                </div>
              </Accordion>
            ) : null}

            {query.length > 0 ? (
              <Accordion title="Query">
                <div className="flex flex-col gap-4">
                  {query.map((field) =>
                    renderCustomField(
                      `query.${field.name}`,
                      field,
                      fields.query,
                      field.name,
                    ),
                  )}
                </div>
              </Accordion>
            ) : null}

            {header.length > 0 ? (
              <Accordion title="Headers">
                <div className="flex flex-col gap-4">
                  {header.map((field) =>
                    renderCustomField(
                      `header.${field.name}`,
                      field,
                      fields.header,
                      field.name,
                    ),
                  )}
                </div>
              </Accordion>
            ) : null}

            {body ? (
              <Accordion title="Body">
                {body.type === 'object' && !fields.body ? (
                  <ObjectInput field={body} fieldName="body" />
                ) : (
                  renderCustomField('body', body, fields.body)
                )}
              </Accordion>
            ) : null}
          </Accordions>

          {testQuery.data ? <ResultDisplay data={testQuery.data} /> : null}
        </form>
      </SchemaContext.Provider>
    </Form>
  );
}

function createPathnameFromInput(
  route: string,
  input: Record<string, unknown>,
): string {
  let pathname = route;
  Object.keys(input).forEach((key) => {
    const paramValue = input[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      pathname = pathname.replace(`{${key}}`, paramValue);
  });
  return pathname;
}

function RouteDisplay({ route }: { route: string }): ReactElement {
  const pathInput = useWatch<FormValues, 'path'>({
    name: 'path',
  });
  const pathname = useMemo(
    () => createPathnameFromInput(route, pathInput),
    [route, pathInput],
  );

  return (
    <code className="flex-1 overflow-auto text-nowrap rounded-lg border bg-fd-muted px-3 py-1.5 text-sm text-fd-muted-foreground">
      {pathname}
    </code>
  );
}

function ResultDisplay({
  data,
}: {
  data: { status: number; data: unknown };
}): ReactElement {
  const statusInfo = useMemo(() => getStatusInfo(data.status), [data.status]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-fd-card p-4">
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-foreground">
        <statusInfo.icon className={cn('size-4', statusInfo.color)} />
        {statusInfo.description}
      </div>
      <p className="text-sm text-fd-muted-foreground">{data.status}</p>
      {data.data ? (
        <CodeBlock
          code={JSON.stringify(data.data, null, 2)}
          className="max-h-[288px]"
        />
      ) : null}
    </div>
  );
}
