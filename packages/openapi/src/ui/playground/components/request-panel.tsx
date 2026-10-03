'use client';
import { Fragment, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Braces,
  ChevronRight,
  Cookie,
  KeyRound,
  type LucideIcon,
  PlusIcon,
  Route,
  Rows3,
  SlidersHorizontal,
} from 'lucide-react';
import { type FieldKey, useDataEngine } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  anyFields,
  useResolvedSchema,
  useSchemaUtils,
} from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { Spinner } from 'shared-api/components/spinner';
import { type AuthField, type useAuthFields, usePlaygroundAuth } from '@/playground/auth';
import type { ParameterObject } from '@/types';
import { cn } from '@/utils/cn';
import {
  type FieldEntry,
  FieldRow,
  FieldRows,
  getNestedFields,
  getRemoval,
  LinkRow,
  type NavigateFn,
  resolveField,
  ValueRow,
} from './fields';
import { OAuthPanel } from './oauth-panel';
import { Segmented, SegmentedList } from './segmented';

export interface RequestBodyInfo {
  schema: JsonSchema;
  mediaType: string;
}

interface RenderOptions {
  renderParameterField?: (fieldName: FieldKey, param: ParameterObject) => ReactNode;
  renderBodyField?: (fieldName: 'body', info: RequestBodyInfo) => ReactNode;
}

const paramTypes = ['path', 'query', 'header', 'cookie'] as const;
type ParamType = (typeof paramTypes)[number];

const sectionIcons: Record<ParamType, LucideIcon> = {
  path: Route,
  query: SlidersHorizontal,
  header: Rows3,
  cookie: Cookie,
};

/** into a nested field, out of it, or to its next/previous sibling */
type Motion = 'forward' | 'back' | 'next' | 'previous';

const motionClassNames: Record<Motion, string> = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
  next: 'motion-safe:starting:translate-y-4',
  previous: 'motion-safe:starting:-translate-y-4',
};

/** the overview of all request inputs, nested fields open in their own panel */
export function RequestPanel({
  auth,
  body,
  parameters,
  className,
  ...options
}: RenderOptions & {
  auth: ReturnType<typeof useAuthFields>;
  body?: RequestBodyInfo;
  parameters: ParameterObject[];
  className?: string;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const [stack, setStack] = useState<FieldEntry[]>([]);
  const [oauth, setOAuth] = useState<AuthField | null>(null);
  const [motion, setMotion] = useState<Motion>('forward');
  const scrollRef = useRef<HTMLDivElement>(null);
  const overviewScroll = useRef(0);
  const current = stack.at(-1);
  const sectionNames: Record<string, string> = {
    path: t('Path'),
    query: t('Query'),
    header: t('Header'),
    cookie: t('Cookies'),
    body: t('Body'),
  };

  function navigate(next: FieldEntry[], nextMotion?: Motion) {
    const target = next.at(-1);
    if (target)
      engine.init(target.fieldName, () => {
        const field = resolveField(target.schema, undefined);
        return field ? generateDefault(field) : undefined;
      });
    if (stack.length === 0 && scrollRef.current)
      overviewScroll.current = scrollRef.current.scrollTop;
    setMotion(nextMotion ?? (next.length >= stack.length ? 'forward' : 'back'));
    setStack(next);
  }

  function openOAuth(field: AuthField | null) {
    if (field && scrollRef.current) overviewScroll.current = scrollRef.current.scrollTop;
    setMotion(field ? 'forward' : 'back');
    setOAuth(field);
  }

  useLayoutEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = stack.length === 0 && !oauth ? overviewScroll.current : 0;
  }, [stack, oauth]);

  const panelClassName = cn(
    'starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]',
    motionClassNames[motion],
  );

  return (
    <div
      ref={scrollRef}
      className={cn('fd-scroll-container @container min-h-0 overflow-y-auto', className)}
    >
      {oauth ? (
        <>
          <PanelNav
            root={t('Authorization')}
            onRoot={() => openOAuth(null)}
            onBack={() => openOAuth(null)}
          >
            <Crumb>
              <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
                {oauth.schemeId}
              </span>
            </Crumb>
          </PanelNav>
          <div key="oauth" className={panelClassName}>
            <OAuthPanel
              field={oauth}
              onToken={(token) => {
                engine.update(oauth.fieldName, token);
                openOAuth(null);
              }}
            />
          </div>
        </>
      ) : current ? (
        <>
          <Breadcrumbs
            root={sectionNames[stack[0].fieldName[0]]}
            stack={stack}
            onNavigate={navigate}
          />
          <div key={stringifyFieldKey(current.fieldName)} className={panelClassName}>
            <FieldRows
              entry={current}
              showDescription
              onNavigate={(entry) => navigate([...stack, entry])}
            />
          </div>
        </>
      ) : (
        <div key="overview" className={panelClassName}>
          <Overview
            {...options}
            auth={auth}
            body={body}
            parameters={parameters}
            sectionNames={sectionNames}
            onNavigate={(entry) => navigate([entry])}
            onOAuth={openOAuth}
          />
        </div>
      )}
    </div>
  );
}

const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

/** the bar on top of a panel, going back to the overview from `root` */
function PanelNav({
  root,
  onRoot,
  onBack,
  end,
  children,
}: {
  root: ReactNode;
  onRoot: () => void;
  onBack: () => void;
  end?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <nav
      aria-label={t('Breadcrumb')}
      className="sticky top-0 z-10 flex h-10 items-center gap-1 border-b bg-fd-card ps-1.5 pe-1.5 text-[0.8125rem]"
    >
      <button
        type="button"
        aria-label={t('Back')}
        onClick={onBack}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'me-1 text-fd-muted-foreground',
        )}
      >
        <ArrowLeft />
      </button>
      <ol className="flex min-w-0 items-center gap-0.5">
        <li className="flex min-w-0 shrink-0 items-center">
          <button type="button" onClick={onRoot} className={crumbClassName}>
            {root}
          </button>
        </li>
        {children}
      </ol>
      {end}
    </nav>
  );
}

function Crumb({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-0.5 last:shrink-0 motion-safe:transition-opacity motion-safe:starting:opacity-0">
      <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground/60" />
      {children}
    </li>
  );
}

function Breadcrumbs({
  root,
  stack,
  onNavigate,
}: {
  root: ReactNode;
  stack: FieldEntry[];
  onNavigate: (stack: FieldEntry[], motion?: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const current = stack[stack.length - 1];

  return (
    <PanelNav
      root={root}
      onRoot={() => onNavigate([])}
      onBack={() => onNavigate(stack.slice(0, -1))}
      end={
        current.removal && (
          <button
            type="button"
            onClick={() => {
              engine.delete(current.fieldName);
              onNavigate(stack.slice(0, -1));
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'ms-auto shrink-0 text-fd-muted-foreground',
            )}
          >
            {current.removal === 'remove' ? t('Remove') : t('Unset')}
          </button>
        )
      }
    >
      {stack.map((entry, i) => {
        const { siblings } = entry;
        let node: ReactNode;
        if (i < stack.length - 1) {
          node = (
            <button
              type="button"
              onClick={() => onNavigate(stack.slice(0, i + 1))}
              className={cn(crumbClassName, 'font-mono')}
            >
              {entry.name}
            </button>
          );
        } else if (siblings && siblings.length > 1) {
          node = (
            <SiblingSelect
              entry={entry}
              siblings={siblings}
              onSelect={(sibling, motion) =>
                onNavigate([...stack.slice(0, -1), { ...sibling, siblings }], motion)
              }
            />
          );
        } else {
          node = (
            <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
              {entry.name}
            </span>
          );
        }

        return <Crumb key={stringifyFieldKey(entry.fieldName)}>{node}</Crumb>;
      })}
    </PanelNav>
  );
}

/** the current field, switches to the other nested fields of its parent */
function SiblingSelect({
  entry,
  siblings,
  onSelect,
}: {
  entry: FieldEntry;
  siblings: FieldEntry[];
  onSelect: (sibling: FieldEntry, motion: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const current = stringifyFieldKey(entry.fieldName);
  const items = siblings.map((item) => ({
    value: stringifyFieldKey(item.fieldName),
    label: item.name,
  }));

  return (
    <Select
      items={items}
      value={current}
      onValueChange={(value) => {
        const next = items.findIndex((item) => item.value === value);
        if (next === -1 || value === current) return;
        const prev = items.findIndex((item) => item.value === current);
        onSelect(siblings[next], next > prev ? 'next' : 'previous');
      }}
    >
      <SelectTrigger
        aria-label={t('Switch Field')}
        className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 font-mono text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
      >
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-[0.8125rem]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Overview({
  auth,
  body,
  parameters,
  sectionNames,
  onNavigate,
  onOAuth,
  renderParameterField,
  renderBodyField,
}: RenderOptions & {
  auth: ReturnType<typeof useAuthFields>;
  body?: RequestBodyInfo;
  parameters: ParameterObject[];
  sectionNames: Record<string, string>;
  onNavigate: NavigateFn;
  onOAuth: (field: AuthField) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const groups = useMemo(() => {
    const out: Partial<Record<ParamType, { param: ParameterObject; entry: FieldEntry }[]>> = {};
    for (const param of parameters) {
      const type = param.in as ParamType;
      (out[type] ??= []).push({
        param,
        entry: {
          fieldName: [type, param.name!],
          name: param.name!,
          schema: getParameterSchema(param),
          removal: getRemoval(param.required ?? false, false),
        },
      });
    }
    return out;
  }, [parameters]);

  if (auth.requirements.length === 0 && parameters.length === 0 && !body) {
    return (
      <p className="p-6 text-center text-sm text-fd-muted-foreground">
        {t('This endpoint has no parameters.')}
      </p>
    );
  }

  return (
    <>
      {auth.requirements.length > 0 && <AuthSection auth={auth} onOAuth={onOAuth} />}
      {paramTypes.map((type) => {
        const items = groups[type];
        if (!items) return;
        const navigate: NavigateFn = (entry) => {
          const candidates: FieldEntry[] = [];
          for (const item of items) candidates.push(item.entry);

          onNavigate({ ...entry, siblings: getNestedFields(engine, candidates) });
        };

        return (
          <Section
            key={type}
            icon={sectionIcons[type]}
            title={sectionNames[type]}
            count={items.length}
          >
            {items.map(({ param, entry }) => {
              if (renderParameterField)
                return (
                  <Fragment key={entry.name}>
                    {renderParameterField(entry.fieldName, param)}
                  </Fragment>
                );

              return (
                <FieldRow
                  key={entry.name}
                  name={entry.name}
                  fieldName={entry.fieldName}
                  schema={entry.schema}
                  required={param.required}
                  description={param.description}
                  onNavigate={navigate}
                />
              );
            })}
          </Section>
        );
      })}
      {body && (
        <BodySection body={body} renderBodyField={renderBodyField} onNavigate={onNavigate} />
      )}
    </>
  );
}

function getParameterSchema(param: ParameterObject): JsonSchema {
  if (param.content) {
    for (const type in param.content)
      return (param.content[type].schema ?? anyFields) as JsonSchema;
  }

  return (param.schema ?? anyFields) as JsonSchema;
}

function Section({
  icon: Icon,
  title,
  count,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b last:border-b-0">
      <div className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-fd-card ps-4 pe-2">
        <Icon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        <h3 className="text-[0.8125rem] font-medium">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-fd-muted-foreground tabular-nums">{count}</span>
        )}
        <div className="ms-auto flex min-w-0 items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

function AuthSection({
  auth,
  onOAuth,
}: {
  auth: ReturnType<typeof useAuthFields>;
  onOAuth: (field: AuthField) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const { isLoading, error } = usePlaygroundAuth();
  const { requirements, selected, select, fields } = auth;
  const items = requirements.map((requirement, i) => ({
    value: i,
    label: (
      <span className="inline-flex items-center gap-1 font-mono">
        {requirement.map((item, j) => (
          <Fragment key={item.id}>
            {j > 0 && <PlusIcon className="size-3 text-fd-muted-foreground" />}
            <span className={cn(item.scheme.deprecated && 'text-fd-muted-foreground line-through')}>
              {item.id}
            </span>
          </Fragment>
        ))}
      </span>
    ),
  }));

  return (
    <Section
      icon={KeyRound}
      title={t('Authorization')}
      actions={
        <>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-fd-muted-foreground">
              <Spinner className="size-3" />
              {t('Fetching token...')}
            </span>
          )}
          {items.length > 1 ? (
            <Select items={items} value={selected} onValueChange={(v) => v !== null && select(v)}>
              <SelectTrigger className="h-7 w-auto max-w-60 gap-1.5 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent align="end">
                {items.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="truncate pe-2 text-xs text-fd-muted-foreground">
              {items[0]?.label}
            </span>
          )}
        </>
      }
    >
      {error != null && (
        <div className="border-b px-4 py-2.5 text-xs">
          <p className="font-medium text-red-400">{t('Failed to fetch token')}</p>
          <p className="text-fd-muted-foreground">{String(error)}</p>
        </div>
      )}
      {fields.map((field) => (
        <AuthRows key={stringifyFieldKey(field.fieldName)} field={field} onOAuth={onOAuth} />
      ))}
    </Section>
  );
}

function AuthRows({ field, onOAuth }: { field: AuthField; onOAuth: (field: AuthField) => void }) {
  const t = useTranslations({ note: 'playground' });
  const { fieldName, scheme } = field;

  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return (
      <>
        <ValueRow
          name="username"
          type="basic"
          description={scheme.description}
          fieldName={[...fieldName, 'username']}
          field={{ type: 'string' }}
        />
        <ValueRow
          name="password"
          fieldName={[...fieldName, 'password']}
          field={{ type: 'string', format: 'password' }}
        />
      </>
    );
  }

  if (scheme.type === 'apiKey') {
    return (
      <ValueRow
        name={scheme.name!}
        type={scheme.in}
        description={scheme.description}
        fieldName={fieldName}
        field={{ type: 'string' }}
      />
    );
  }

  return (
    <>
      <ValueRow
        name="Authorization"
        type="header"
        description={
          scheme.type === 'http' || scheme.type === 'oauth2'
            ? scheme.description
            : t(
                'OpenID Connect is not supported at the moment, you can still set an access token here.',
              )
        }
        fieldName={fieldName}
        field={{ type: 'string' }}
      />
      {scheme.type === 'oauth2' && (
        <LinkRow name={field.schemeId} onClick={() => onOAuth(field)}>
          {t('Authorize')}
        </LinkRow>
      )}
    </>
  );
}

function BodySection({
  body,
  renderBodyField,
  onNavigate,
}: Pick<RenderOptions, 'renderBodyField'> & {
  body: RequestBodyInfo;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'playground' });
  const [mode, setMode] = useState('form');
  const root = useResolvedSchema(body.schema);
  const entry = useMemo<FieldEntry>(
    () => ({ fieldName: ['body'], name: 'body', schema: body.schema }),
    [body.schema],
  );
  const allowJson =
    !renderBodyField &&
    body.mediaType !== 'multipart/form-data' &&
    !(root.type === 'string' && root.format === 'binary');

  let content: ReactNode;
  if (renderBodyField) content = renderBodyField('body', body);
  else if (allowJson && mode === 'json') content = <JsonEditor fieldName={entry.fieldName} />;
  else content = <FieldRows entry={entry} onNavigate={onNavigate} />;

  return (
    <Section
      icon={Braces}
      title={t('Body')}
      actions={
        <>
          <code className="truncate text-xs text-fd-muted-foreground">{body.mediaType}</code>
          {allowJson && (
            <Segmented value={mode} onValueChange={setMode}>
              <SegmentedList
                aria-label={t('Editor')}
                items={[
                  { value: 'form', label: t('Form') },
                  { value: 'json', label: 'JSON' },
                ]}
              />
            </Segmented>
          )}
        </>
      }
    >
      {content}
    </Section>
  );
}

function JsonEditor({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(() => JSON.stringify(engine.init(fieldName, {}), null, 2));

  return (
    <div className="flex flex-col">
      <textarea
        aria-label="JSON"
        value={value}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          try {
            engine.update(fieldName, JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            if (err instanceof Error) setError(err.message);
          }
        }}
        className="min-h-60 w-full resize-none bg-transparent px-4 py-3 font-mono text-[0.8125rem] leading-relaxed outline-none field-sizing-content"
      />
      {error && <p className="border-t px-4 py-2 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}
