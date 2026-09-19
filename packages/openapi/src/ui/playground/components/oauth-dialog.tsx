import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'shared-api/components/dialog';
import { Input } from 'shared-api/components/input';
import { Label } from 'shared-api/components/label';
import { useQuery } from 'shared-api/utils/use-query';
import { type ReactNode, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { useTranslations } from '@fuma-translate/react';
import { type OAuthFlowType, requestOAuthToken, usePlaygroundAuth } from '@/playground/auth';
import { useOpenAPI } from '@/utils/create-page';

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

interface FlowInfo {
  name: ReactNode;
  description: ReactNode;
  supported: boolean;
}

export const OAuthDialog = Dialog;

export function OAuthDialogContent(props: AuthDialogContentProps) {
  const t = useTranslations({ note: 'OAuth dialog' });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('Authorization')}</DialogTitle>
        <DialogDescription>{t('Obtain the access token for API.')}</DialogDescription>
      </DialogHeader>
      <Content {...props} />
    </DialogContent>
  );
}

function Content({ schemeId, scopes, setToken, setOpen }: AuthDialogContentProps) {
  const { dereferenced, resolve } = useOpenAPI().doc;
  const schemes = dereferenced.components?.securitySchemes;
  const tokenInfo = usePlaygroundAuth().store[schemeId];
  const scheme = resolve(schemes?.[schemeId]);
  if (!scheme || scheme.type !== 'oauth2')
    throw new Error('unexpected schemaId: must be type oauth2');

  const [type, setType] = useState<OAuthFlowType | null>(() => {
    return Object.keys(scheme.flows!)[0] as OAuthFlowType;
  });
  const [clientAuth, setClientAuth] = useState<'body' | 'header'>('body');

  const t = useTranslations({ note: 'OAuth dialog' });
  const clientAuthMethods = {
    body: {
      name: t('Send client credentials in body'),
      description: t('Include the client ID and secret in the token request body.'),
    },
    header: {
      name: t('Send as Basic Auth header'),
      description: t('Send the client ID and secret in the Authorization header.'),
    },
  };
  const allFlows: Record<OAuthFlowType, FlowInfo> = useMemo(
    () => ({
      password: {
        name: t('Resource Owner Password Flow'),
        description: t('Authenticate using username and password.'),
        supported: true,
      },
      clientCredentials: {
        name: t('Client Credentials'),
        description: t('Intended for the server-to-server authentication.'),
        supported: true,
      },
      authorizationCode: {
        name: t('Authorization code'),
        description: t('Authenticate with 3rd party services'),
        supported: true,
      },
      implicit: {
        name: t('Implicit'),
        description: t('Retrieve the access token directly.'),
        supported: true,
      },
      deviceAuthorization: {
        name: t('Device Authorization'),
        description: t('Authenticate with device.'),
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
    if (!type) return;
    const token = await requestOAuthToken(scheme, type, {
      ...values,
      schemeId,
      scopes,
      clientAuth,
    });
    if (!token) return;

    setToken(token);
    setOpen(false);
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
      <Select
        items={Object.keys(scheme.flows!).map((key) => {
          const { name, description } = allFlows[key as OAuthFlowType];

          return {
            value: key,
            label: (
              <>
                <p className="font-medium">{name}</p>
                <p className="text-fd-muted-foreground">{description}</p>
              </>
            ),
          };
        })}
        value={type}
        onValueChange={setType}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('Select a flow')} />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(scheme.flows!).map((key) => {
            const { name, description } = allFlows[key as OAuthFlowType];

            return (
              <SelectItem key={key} value={key}>
                <p className="font-medium">{name}</p>
                <p className="text-fd-muted-foreground">{description}</p>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {(type === 'authorizationCode' ||
        type === 'clientCredentials' ||
        type === 'implicit' ||
        type === 'password') && (
        <fieldset className="flex flex-col gap-1.5">
          <Label htmlFor="client_id">{t('Client ID')}</Label>
          <p className="text-fd-muted-foreground text-sm">
            {t('The client ID of your OAuth application.')}
          </p>
          <Input
            id="client_id"
            name="clientId"
            placeholder={t('Enter value')}
            type="text"
            autoComplete="off"
            disabled={isLoading}
            defaultValue={defaultValues.clientId}
            required={type !== 'password' || clientAuth === 'header'}
          />
        </fieldset>
      )}
      {(type === 'authorizationCode' || type === 'clientCredentials' || type === 'password') && (
        <fieldset className="flex flex-col gap-1.5">
          <Label htmlFor="client_secret">{t('Client Secret')}</Label>
          <p className="text-fd-muted-foreground text-sm">
            {t('The client secret of your OAuth application.')}
          </p>
          <Input
            id="client_secret"
            name="clientSecret"
            placeholder={t('Enter value')}
            type="password"
            autoComplete="off"
            disabled={isLoading}
            defaultValue={defaultValues.clientSecret}
            required={type !== 'password' || clientAuth === 'header'}
          />
        </fieldset>
      )}
      {type === 'password' && (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor="client_auth">{t('Client Authentication')}</Label>
            <Select
              items={Object.entries(clientAuthMethods).map(([key, method]) => ({
                label: (
                  <>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-fd-muted-foreground">{method.description}</p>
                  </>
                ),
                value: key,
              }))}
              value={clientAuth}
              onValueChange={(v) => v !== null && setClientAuth(v)}
            >
              <SelectTrigger id="client_auth" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(clientAuthMethods).map(([key, method]) => (
                  <SelectItem key={key} value={key}>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-fd-muted-foreground">{method.description}</p>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor="username">{t('Username')}</Label>
            <Input
              id="username"
              name="username"
              placeholder={t('Enter value')}
              type="text"
              autoComplete="off"
              disabled={isLoading}
              defaultValue={defaultValues.username}
              required
            />
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('Password')}</Label>
            <Input
              id="password"
              name="password"
              placeholder={t('Enter value')}
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
                variant: 'default',
              }),
            )}
          >
            {t('Submit')}
          </button>
        </>
      ) : (
        <p className="text-fd-muted-foreground bg-fd-muted p-2 rounded-lg border">
          {t('Unsupported')}
        </p>
      )}
    </form>
  );
}

export const OAuthDialogTrigger = DialogTrigger;
