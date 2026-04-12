import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import { Input, labelVariants } from '@/ui/components/input';
import { useQuery } from '@/utils/use-query';
import { type ReactNode, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import type { OAuth2SecurityScheme } from '@/types';
import { useTranslations } from '@/ui/client/i18n';
import { useAuth } from '../auth';
import { useApiContext } from '@/ui/contexts/api';

type FlowType = keyof NonNullable<OAuth2SecurityScheme['flows']>;

export interface AuthDialogContentProps {
  schemeId: string;
  scopes: string[];

  setOpen: (v: boolean) => void;
  setToken: (token: string) => void;
}

interface FormValues {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface AuthCodeState {
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  /** name of the source security scheme */
  scheme: string;
}

export interface ImplicitState {
  redirect_uri: string;
  client_id: string;
  /** name of the source security scheme */
  scheme: string;
}

interface FlowInfo {
  name: ReactNode;
  description: ReactNode;
  supported: boolean;
}

export const OAuthDialog = Dialog;

export function OAuthDialogContent(props: AuthDialogContentProps) {
  const t = useTranslations();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t.authorization}</DialogTitle>
        <DialogDescription>{t.obtainAccessToken}</DialogDescription>
      </DialogHeader>
      <Content {...props} />
    </DialogContent>
  );
}

function Content({ schemeId, scopes, setToken, setOpen }: AuthDialogContentProps) {
  const { schemes } = useApiContext();
  const tokenInfo = useAuth().store[schemeId];
  const scheme = schemes[schemeId];
  if (!scheme || scheme.type !== 'oauth2')
    throw new Error('unexpected schemaId: must be type oauth2');

  const [type, setType] = useState<FlowType | null>(() => {
    return Object.keys(scheme.flows!)[0] as FlowType;
  });

  const t = useTranslations();
  const allFlows: Record<FlowType, FlowInfo> = useMemo(
    () => ({
      password: {
        name: t.resourceOwnerPassword,
        description: t.resourceOwnerPasswordDesc,
        supported: true,
      },
      clientCredentials: {
        name: t.clientCredentials,
        description: t.clientCredentialsDesc,
        supported: true,
      },
      authorizationCode: {
        name: t.authorizationCode,
        description: t.authorizationCodeDesc,
        supported: true,
      },
      implicit: {
        name: t.implicit,
        description: t.implicitDesc,
        supported: true,
      },
      deviceAuthorization: {
        name: t.deviceAuthorization,
        description: t.deviceAuthorizationDesc,
        supported: false,
      },
    }),
    [t],
  );

  const defaultValues = useMemo((): FormValues => {
    return {
      clientId: tokenInfo?.client_id ?? '',
      clientSecret: tokenInfo?.type === 'authorization_code' ? tokenInfo.client_secret : '',
      username: '',
      password: '',
    };
  }, [tokenInfo]);

  const authorize = useQuery(async (values: FormValues) => {
    if (type === 'implicit') {
      const value = scheme.flows![type]!;

      const params = new URLSearchParams();
      params.set('response_type', 'token');
      params.set('client_id', values.clientId);
      params.set('redirect_uri', window.location.href);
      params.set('scope', scopes.join('+'));
      params.set(
        'state',
        JSON.stringify({
          scheme: schemeId,
          client_id: values.clientId,
          redirect_uri: window.location.href,
        } satisfies ImplicitState),
      );

      window.location.replace(`${value.authorizationUrl}?${params.toString()}`);
      return;
    }
    if (type === 'authorizationCode') {
      const value = scheme.flows![type]!;

      const params = new URLSearchParams();
      params.set('response_type', 'code');
      params.set('client_id', values.clientId);
      params.set('redirect_uri', window.location.href);
      params.set('scope', scopes.join('+'));
      params.set(
        'state',
        JSON.stringify({
          client_id: values.clientId,
          client_secret: values.clientSecret,
          redirect_uri: window.location.href,
          scheme: schemeId,
        } satisfies AuthCodeState),
      );

      window.location.replace(`${value.authorizationUrl}?${params.toString()}`);
      return;
    }

    let res;
    if (type === 'password') {
      const value = scheme.flows![type]!;

      res = await fetch(value.tokenUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: values.username,
          password: values.password,
          scope: scopes.join('+'),
        }),
      });
    }

    if (type === 'clientCredentials') {
      const value = scheme.flows![type]!;

      res = await fetch(value.tokenUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: values.clientId,
          client_secret: values.clientSecret,
          scope: scopes.join('+'),
        }),
      });
    }

    if (res) {
      if (!res.ok) throw new Error(await res.text());

      const { access_token, token_type = 'Bearer' } = (await res.json()) as {
        access_token: string;
        token_type?: string;
      };

      setToken(`${token_type} ${access_token}`);
      setOpen(false);
    }
  });

  const isLoading = authorize.isLoading;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        const formData = new FormData(e.target);

        void authorize.start(Object.fromEntries(formData.entries()) as unknown as FormValues);
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Select value={type ?? ''} onValueChange={setType as (s: string) => void}>
        <SelectTrigger>
          <SelectValue placeholder="Select a flow" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(scheme.flows!).map((key) => {
            const { name, description } = allFlows[key as FlowType];

            return (
              <SelectItem key={key} value={key}>
                <p className="font-medium">{name}</p>
                <p className="text-fd-muted-foreground">{description}</p>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {(type === 'authorizationCode' || type === 'clientCredentials' || type === 'implicit') && (
        <fieldset className="flex flex-col gap-1.5">
          <label htmlFor="client_id" className={cn(labelVariants())}>
            {t.clientId}
          </label>
          <p className="text-fd-muted-foreground text-sm">{t.clientIdHint}</p>
          <Input
            id="client_id"
            name="clientId"
            placeholder={t.inputPlaceholder}
            type="text"
            autoComplete="off"
            disabled={isLoading}
            defaultValue={defaultValues.clientId}
            required
          />
        </fieldset>
      )}
      {(type === 'authorizationCode' || type === 'clientCredentials') && (
        <fieldset className="flex flex-col gap-1.5">
          <label htmlFor="client_secret" className={cn(labelVariants())}>
            {t.clientSecret}
          </label>
          <p className="text-fd-muted-foreground text-sm">{t.clientSecretHint}</p>
          <Input
            id="client_secret"
            name="clientSecret"
            placeholder={t.inputPlaceholder}
            type="password"
            autoComplete="off"
            disabled={isLoading}
            defaultValue={defaultValues.clientSecret}
            required
          />
        </fieldset>
      )}
      {type === 'password' && (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <label htmlFor="username" className={cn(labelVariants())}>
              {t.usernameField}
            </label>
            <Input
              id="username"
              name="username"
              placeholder={t.inputPlaceholder}
              type="text"
              autoComplete="off"
              disabled={isLoading}
              defaultValue={defaultValues.username}
              required
            />
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <label htmlFor="password" className={cn(labelVariants())}>
              {t.clientSecret}
            </label>
            <Input
              id="password"
              name="password"
              placeholder={t.inputPlaceholder}
              type="password"
              autoComplete="off"
              disabled={isLoading}
              defaultValue={defaultValues.password}
              required
            />
          </fieldset>
        </>
      )}
      {type && allFlows[type].supported ? (
        <>
          {authorize.error ? (
            <p className="text-red-400 font-medium text-sm">{String(authorize.error)}</p>
          ) : null}
          <button
            type="submit"
            className={cn(
              buttonVariants({
                color: 'primary',
              }),
            )}
          >
            {t.submit}
          </button>
        </>
      ) : (
        <p className="text-fd-muted-foreground bg-fd-muted p-2 rounded-lg border">
          {t.unsupported}
        </p>
      )}
    </form>
  );
}

export const OAuthDialogTrigger = DialogTrigger;
