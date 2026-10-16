'use client';
import { Fragment, type ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { SelectTab, SelectTabs, SelectTabTrigger } from 'shared-api/components/select-tab';
import type { OAuthFlowObject, OAuthFlowsObject, SecuritySchemeObject } from '@/types';
import { type SecurityRequirement, useOperationSecurity } from '@/operation';
import { useServer } from '@/utils/use-server';
import { Markdown } from '@/ui/components/markdown';
import { SectionHeader } from './section';

/**
 * The security schemes of the server and operation, one of each list authorizes the operation.
 */
export function AuthSection({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'operation page' });
  const groups = useSecurityGroups();
  const { server } = useServer();
  if (groups.length === 0) return null;

  return (
    <>
      <SectionHeader id="authorization" depth={headingLevel} title={t('Authorization')} />
      <div className="flex flex-col gap-4">
        {groups.map((items, i) => (
          <div key={i}>
            {groups.length > 1 && (
              <p className="mb-2 text-sm text-fd-muted-foreground not-prose">
                {i === 0 ? t('To connect to the server') : t('To perform the operation')}
              </p>
            )}
            {/* the lists differ by server, select their first scheme again */}
            <RequirementCard key={server?.id} items={items} />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Lists of alternative security schemes, one of each list is required: the server's, then the operation's when they differ.
 */
export function useSecurityGroups(): SecurityRequirement[][] {
  const { server, operation } = useOperationSecurity();
  const groups: SecurityRequirement[][] = [];
  if (server.length > 0) groups.push(server);
  if (
    operation.length > 0 &&
    (operation.length !== server.length ||
      operation.some((item, i) => item.scheme !== server[i].scheme))
  )
    groups.push(operation);

  return groups;
}

function RequirementCard({ items }: { items: SecurityRequirement[] }) {
  const t = useTranslations({ note: 'operation page' });
  const options = items.map((item, i) => ({
    value: String(i),
    label: <code className="truncate">{item.id}</code>,
  }));

  return (
    <SelectTabs defaultValue="0">
      <div className="overflow-hidden rounded-xl border bg-fd-card">
        <div className="flex h-9 items-center border-b ps-1.5 pe-1 text-[0.8125rem] not-prose">
          {options.length > 1 ? (
            <SelectTabTrigger
              aria-label={t('Security scheme')}
              items={options}
              className="h-7 w-auto gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium hover:bg-fd-accent hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent"
            />
          ) : (
            <span className="min-w-0 px-1.5 font-medium">{options[0].label}</span>
          )}
        </div>
        {items.map((item, i) => (
          <SelectTab key={i} value={String(i)} className="px-3">
            <SchemeRow scheme={item.scheme} />
          </SelectTab>
        ))}
      </div>
    </SelectTabs>
  );
}

function SchemeRow({ scheme }: { scheme: SecuritySchemeObject }) {
  const t = useTranslations({ note: 'security scheme' });
  const scopes = scheme.scopes ?? [];
  /** where the credential is sent, like `header` or `query` */
  let location: string | undefined;
  let name: string;
  /** the format of value */
  let format: string | undefined;

  switch (scheme.type) {
    case 'httpApiKey':
      location = scheme.in;
      name = scheme.name ?? t('API Key');
      format = '<api-key>';
      break;
    case 'apiKey':
      location = scheme.in;
      name = t('API Key');
      break;
    case 'http': {
      const type = scheme.scheme?.toLowerCase();
      location = 'header';
      name = 'Authorization';
      if (type === 'basic') format = 'Basic <credentials>';
      else if (type === 'bearer') format = `Bearer <${scheme.bearerFormat ?? 'token'}>`;
      else format = `${scheme.scheme} <credentials>`;
      break;
    }
    case 'oauth2':
    case 'openIdConnect':
      location = 'header';
      name = 'Authorization';
      format = 'Bearer <token>';
      break;
    case 'userPassword':
      name = t('Username and password');
      break;
    case 'X509':
      name = t('Client certificate (X.509)');
      break;
    case 'symmetricEncryption':
      name = t('Symmetric encryption');
      break;
    case 'asymmetricEncryption':
      name = t('Asymmetric encryption');
      break;
    case 'plain':
      name = 'SASL/PLAIN';
      break;
    case 'scramSha256':
      name = 'SASL/SCRAM-SHA-256';
      break;
    case 'scramSha512':
      name = 'SASL/SCRAM-SHA-512';
      break;
    case 'gssapi':
      name = 'SASL/GSSAPI';
      break;
    default:
      name = scheme.type;
  }

  return (
    <div className="py-2.5">
      <div className="flex flex-wrap items-center gap-2 not-prose">
        {location && (
          <span className="rounded-md border bg-fd-secondary px-1.5 font-mono text-xs leading-5 text-fd-muted-foreground">
            {location}
          </span>
        )}
        <code className="text-[0.8125rem] font-medium text-fd-primary">{name}</code>
        {format && <code className="text-xs text-fd-muted-foreground">{format}</code>}
      </div>
      {(scheme.description || scopes.length > 0) && (
        <div className="mt-1 prose-no-margin text-fd-muted-foreground">
          {scheme.description && <Markdown md={scheme.description} />}
          {scopes.length > 0 && (
            <p>
              {t('Scope')}: <code>{scopes.join(', ')}</code>
            </p>
          )}
        </div>
      )}
      {scheme.type === 'openIdConnect' && scheme.openIdConnectUrl && (
        <Details>
          <UrlDetail label={t('Discovery URL')} url={scheme.openIdConnectUrl} />
        </Details>
      )}
      {scheme.type === 'oauth2' && scheme.flows && <OAuthFlows flows={scheme.flows} />}
    </div>
  );
}

function OAuthFlows({ flows }: { flows: OAuthFlowsObject }) {
  const t = useTranslations({ note: 'security scheme' });
  const names = {
    authorizationCode: t('Authorization code'),
    clientCredentials: t('Client credentials'),
    implicit: t('Implicit'),
    password: t('Password'),
  };

  return Object.entries(names).map(([key, title]) => {
    const flow = flows[key as keyof typeof names] as Partial<OAuthFlowObject> | undefined;
    if (!flow) return null;
    const scopes = Object.entries(flow.availableScopes ?? {});

    return (
      <Details key={key} title={title}>
        <UrlDetail label={t('Authorization URL')} url={flow.authorizationUrl} />
        <UrlDetail label={t('Token URL')} url={flow.tokenUrl} />
        <UrlDetail label={t('Refresh URL')} url={flow.refreshUrl} />
        {scopes.length > 0 && (
          <Detail label={t('Scopes')}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              {scopes.map(([scope, description]) => (
                <Fragment key={scope}>
                  <dt>
                    <code>{scope}</code>
                  </dt>
                  <dd className="text-fd-muted-foreground">{description}</dd>
                </Fragment>
              ))}
            </dl>
          </Detail>
        )}
      </Details>
    );
  });
}

function Details({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border bg-fd-secondary/50 text-[0.8125rem] not-prose">
      {title && <p className="border-b px-3 py-1.5 text-xs font-medium">{title}</p>}
      <dl className="flex flex-col gap-1.5 px-3 py-2">{children}</dl>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 @sm:grid-cols-[8rem_minmax(0,1fr)] @sm:gap-3">
      <dt className="text-fd-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function UrlDetail({ label, url }: { label: string; url?: string }) {
  if (!url) return null;

  return (
    <Detail label={label}>
      <code className="break-all">{url}</code>
    </Detail>
  );
}
