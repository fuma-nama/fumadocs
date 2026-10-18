'use client';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  captionCodeBlock,
  cardCodeBlock,
  exampleCardClassName,
  exampleCodeBlock,
  ExampleHeader,
  ExampleSelect,
} from 'shared-api/components/example';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import type { OperationExample } from '@/utils/example';
import {
  codeUsageHeaders,
  selectCodeUsage,
  useCodeUsageId,
  useEndpointUrl,
} from '@/ui/components/code-usage';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { Markdown } from '@/ui/components/markdown';

/** the code usage of the GraphQL document itself */
const graphqlId = 'graphql';

/** the request of the selected example and its response */
export function OperationExamples() {
  const t = useTranslations({ note: 'operation page' });
  const { examples, selected } = useOperation();
  const example = examples.at(selected);
  if (!example) return null;
  const response = example.response !== undefined && JSON.stringify(example.response, null, 2);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <RequestExample example={example} />
      {response && (
        <ClientCodeBlock
          lang="json"
          code={response}
          codeblock={{ ...exampleCodeBlock, title: t('Example Response') }}
        />
      )}
    </div>
  );
}

function RequestExample({ example }: { example: OperationExample }) {
  const t = useTranslations({ note: 'operation page' });
  const { codeUsages, playground } = useRenderContext();
  const { kind, examples, selected, select } = useOperation();
  const url = useEndpointUrl(playground?.url);
  const id = useCodeUsageId();
  const generators = codeUsages.map();
  const languages = [{ value: graphqlId, label: 'GraphQL' }];
  let value = graphqlId;
  // code samples send HTTP POST requests, which subscriptions don't use
  if (kind !== 'subscription') {
    for (const [key, item] of generators)
      languages.push({ value: key, label: item.label ?? item.lang });
    if (id !== null && generators.has(id)) value = id;
  }
  const generator = generators.get(value);

  let code = example.query;
  let body: ReactNode;
  if (generator) {
    const headers = codeUsageHeaders(playground?.headers);
    code = generator.generate(
      { url, query: example.query, variables: example.variables, headers },
      undefined,
    );
    body = <ClientCodeBlock lang={generator.lang} code={code} codeblock={cardCodeBlock} />;
  } else {
    const variables = example.variables && JSON.stringify(example.variables, null, 2);

    body = (
      <>
        <ClientCodeBlock lang="graphql" code={code} codeblock={cardCodeBlock} />
        {variables !== undefined && (
          <ClientCodeBlock
            lang="json"
            code={variables}
            codeblock={{
              title: t('Variables'),
              // the query scrolls before its variables
              className: `${captionCodeBlock.className} shrink-0`,
              viewportProps: { className: 'max-h-60' },
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={exampleCardClassName}>
      <ExampleHeader
        title={examples.length === 1 && (example.name ?? t('Example Request'))}
        description={
          example.description && (
            <div className="-mt-1.5 pe-2.5 pb-2.5 prose prose-xs prose-no-margin text-fd-muted-foreground">
              <Markdown md={example.description} />
            </div>
          )
        }
        copy={code}
      >
        {examples.length > 1 && (
          <ExampleSelect
            items={examples.map((item, i) => ({
              value: String(i),
              label: item.name ?? t('Example Request'),
              description: item.description && <Markdown md={item.description} />,
            }))}
            value={String(selected)}
            onValueChange={(v) => select(Number(v))}
            align="start"
            className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
          />
        )}
        <ExampleSelect items={languages} value={value} onValueChange={selectCodeUsage} />
      </ExampleHeader>
      {body}
    </div>
  );
}
