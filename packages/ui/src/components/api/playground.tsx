import {
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import useSWRImmutable from 'swr/immutable';
import type { APIPlaygroundProps } from 'fumadocs-openapi';
import { useApiContext } from '@/contexts/api';
import { Form } from '@/components/ui/form';
import { cn } from '@/utils/cn';
import { Accordion, Accordions } from '@/components/accordion';
import * as Base from '@/components/codeblock';
import { createBodyFromValue, getStatusInfo } from '@/components/api/fetcher';
import { buttonVariants } from '@/theme/variants';
import { getDefaultValue, getDefaultValues } from '@/components/api/shared';
import { InputField, ObjectInput } from '@/components/api/inputs';
import { type DynamicField, SchemaContext } from './context';

interface APIPlaygroundFormData {
  authorization?: string | undefined;
  path?: Record<string, string>;
  query?: Record<string, string>;
  header?: Record<string, string>;
  body?: Record<string, unknown>;
}

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang?: string;
};

function CodeBlock({
  code,
  lang = 'json',
  ...props
}: CodeBlockProps): React.ReactElement {
  const { highlighter } = useApiContext();
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!highlighter) return;

    const themedHtml = highlighter.codeToHtml(code, {
      lang,
      defaultColor: false,
      themes: { light: 'github-light', dark: 'github-dark' },
    });

    setHtml(themedHtml);
  }, [code, lang, highlighter]);

  return (
    <Base.CodeBlock className="my-0">
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path = [],
  header = [],
  query = [],
  body,
  schemas,
}: APIPlaygroundProps & HTMLAttributes<HTMLFormElement>): React.ReactElement {
  const { baseUrl } = useApiContext();
  const dynamicRef = useRef(new Map<string, DynamicField>());
  const [input, setInput] = useState<APIPlaygroundFormData>();
  const form = useForm({
    defaultValues: {
      authorization: authorization?.defaultValue,
      path: getDefaultValues(path, schemas),
      query: getDefaultValues(query, schemas),
      header: getDefaultValues(header, schemas),
      body: body ? getDefaultValue(body, schemas) : undefined,
    },
  });

  const testQuery = useSWRImmutable(
    input ? [baseUrl, route, method, input] : null,
    async () => {
      if (!input) return;

      let pathname = route;
      Object.keys(input.path ?? {}).forEach((key) => {
        const paramValue = input.path?.[key];

        if (paramValue) pathname = pathname.replace(`{${key}}`, paramValue);
      });

      const url = new URL(pathname, baseUrl ?? window.location.origin);
      Object.keys(input.query ?? {}).forEach((key) => {
        const paramValue = input.query?.[key];
        if (paramValue) url.searchParams.append(key, paramValue);
      });

      const headers = new Headers({
        'Content-Type': 'application/json',
      });

      if (input.authorization) {
        headers.append('Authorization', input.authorization);
      }

      Object.keys(input.header ?? {}).forEach((key) => {
        const paramValue = input.header?.[key];

        if (paramValue) headers.append(key, paramValue);
      });

      const bodyValue =
        body && input.body && Object.keys(input.body).length > 0
          ? createBodyFromValue(input.body, body, schemas, dynamicRef.current)
          : undefined;
      const response = await fetch(url, {
        method,
        headers,
        body: bodyValue ? JSON.stringify(bodyValue) : undefined,
      });

      const data: unknown = await response.json().catch(() => undefined);

      return { status: response.status, data };
    },
    {
      shouldRetryOnError: false,
    },
  );

  const statusInfo = testQuery.data
    ? getStatusInfo(testQuery.data.status)
    : undefined;

  const onSubmit = form.handleSubmit((value) => {
    setInput(value as APIPlaygroundFormData);
  });

  return (
    <Form {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          className="not-prose flex flex-col gap-4 rounded-lg border bg-card p-4"
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <div className="flex flex-row gap-2">
            <code className="flex-1 overflow-auto rounded-lg border bg-secondary px-3 py-1.5 text-sm">
              {route}
            </code>
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'secondary' }))}
              disabled={testQuery.isLoading}
            >
              Send
            </button>
          </div>

          <Accordions type="multiple" className="-m-4 mt-2 border-0 text-sm">
            {authorization ? (
              <Accordion title="Authorization">
                <InputField
                  name="Authorization"
                  fieldName="authorization"
                  field={authorization}
                />
              </Accordion>
            ) : null}

            {path.length > 0 ? (
              <Accordion title="Path">
                {path.map((field) => (
                  <InputField
                    key={field.name}
                    field={field}
                    name={field.name}
                    fieldName={`path.${field.name}`}
                  />
                ))}
              </Accordion>
            ) : null}

            {query.length > 0 ? (
              <Accordion title="Query">
                <div className="flex flex-col gap-2">
                  {query.map((field) => (
                    <InputField
                      key={field.name}
                      field={field}
                      name={field.name}
                      fieldName={`query.${field.name}`}
                    />
                  ))}
                </div>
              </Accordion>
            ) : null}

            {header.length > 0 ? (
              <Accordion title="Headers">
                {header.map((field) => (
                  <InputField
                    key={field.name}
                    field={field}
                    name={field.name}
                    fieldName={`header.${field.name}`}
                  />
                ))}
              </Accordion>
            ) : null}

            {body ? (
              <Accordion title="Body">
                {body.type === 'object' ? (
                  <ObjectInput field={body} fieldName="body" />
                ) : (
                  <InputField name="Body" field={body} fieldName="body" />
                )}
              </Accordion>
            ) : null}
          </Accordions>

          {testQuery.data && statusInfo ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <statusInfo.icon className={cn('size-4', statusInfo.color)} />
                {statusInfo.description}
              </div>
              <p className="text-sm text-muted-foreground">
                {testQuery.data.status}
              </p>
              {testQuery.data.data ? (
                <CodeBlock
                  code={JSON.stringify(testQuery.data.data, null, 2)}
                  className="max-h-[288px]"
                />
              ) : null}
            </div>
          ) : null}
        </form>
      </SchemaContext.Provider>
    </Form>
  );
}
