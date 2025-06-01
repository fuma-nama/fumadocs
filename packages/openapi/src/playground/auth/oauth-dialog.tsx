import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import type { OpenAPIV3_1 } from 'openapi-types';
import { useForm } from 'react-hook-form';
import { Input, labelVariants } from '@/ui/components/input';
import { useQuery } from '@/utils/use-query';
import { useEffect, useState } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';

type FlowType = keyof OpenAPIV3_1.OAuth2SecurityScheme['flows'];

export interface AuthDialogProps {
  scheme: OpenAPIV3_1.OAuth2SecurityScheme;
  scopes: string[];

  open: boolean;
  setOpen: (v: boolean) => void;
  setToken: (token: string) => void;
  children: React.ReactNode;
}

interface FormValues {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

interface AuthCodeState {
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}

interface ImplicitState {
  redirect_uri: string;
  client_id: string;
}

const FlowTypes = {
  password: {
    name: 'Resource Owner Password Flow',
    description: 'Authenticate using username and password.',
  },
  clientCredentials: {
    name: 'Client Credentials',
    description: 'Intended for the server-to-server authentication.',
  },
  authorizationCode: {
    name: 'Authorization code',
    description: 'Authenticate with 3rd party services',
  },
  implicit: {
    name: 'Implicit',
    description: 'Retrieve the access token directly.',
  },
} as const;

export function OauthDialog({
  scheme,
  scopes,
  setToken,
  children,
  open,
  setOpen,
}: AuthDialogProps) {
  const [type, setType] = useState(() => {
    return Object.keys(scheme.flows)[0] as FlowType;
  });

  const form = useForm<FormValues>({
    defaultValues: {
      clientId: '',
      clientSecret: '',
      username: '',
      password: '',
    },
  });

  const authCodeCallback = useQuery(
    async (code: string, state: AuthCodeState) => {
      const value = scheme.flows.authorizationCode!;

      const res = await fetch(value.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          // note: `state` could be invalid, but server will check it
          redirect_uri: state.redirect_uri,
          client_id: state.client_id,
          client_secret: state.client_secret,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { access_token, token_type = 'Bearer' } = (await res.json()) as {
        access_token: string;
        token_type?: string;
      };

      setToken(`${token_type} ${access_token}`);
      setOpen(false);
    },
  );

  useEffect(() => {
    if (scheme.flows.authorizationCode) {
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state');
      const code = params.get('code');

      if (state && code) {
        const parsedState = JSON.parse(state) as AuthCodeState;
        setOpen(true);

        form.setValue('clientId', parsedState.client_id);
        form.setValue('clientSecret', parsedState.client_secret);
        authCodeCallback.start(code, parsedState);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
    }

    if (scheme.flows.implicit && window.location.hash.length > 1) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const state = params.get('state');
      const token = params.get('access_token');
      const type = params.get('token_type') ?? 'Bearer';

      if (state && token) {
        const parsedState = JSON.parse(state) as ImplicitState;

        form.setValue('clientId', parsedState.client_id);
        setToken(`${type} ${token}`);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first page load only
  }, []);

  const authorize = useQuery(async (values: FormValues) => {
    if (type === 'implicit') {
      const value = scheme.flows[type]!;

      const params = new URLSearchParams();
      params.set('response_type', 'token');
      params.set('client_id', values.clientId);
      params.set('redirect_uri', window.location.href);
      params.set('scope', scopes.join('+'));
      params.set(
        'state',
        JSON.stringify({
          client_id: values.clientId,
          redirect_uri: window.location.href,
        } satisfies ImplicitState),
      );

      window.location.replace(`${value.authorizationUrl}?${params.toString()}`);
      return;
    }
    if (type === 'authorizationCode') {
      const value = scheme.flows[type]!;

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
        } satisfies AuthCodeState),
      );

      window.location.replace(`${value.authorizationUrl}?${params.toString()}`);
      return;
    }

    let res;
    if (type === 'password') {
      const value = scheme.flows[type]!;

      res = await fetch(value.tokenUrl, {
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
      const value = scheme.flows[type]!;

      res = await fetch(value.tokenUrl, {
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

  const onSubmit = form.handleSubmit((values) => {
    return authorize.start(values);
  });

  const isLoading = authorize.isLoading || authCodeCallback.isLoading;
  const error = authCodeCallback.error ?? authorize.error;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authorization</DialogTitle>
          <DialogDescription>
            Obtain the access token for API.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            void onSubmit(e);
            e.stopPropagation();
          }}
        >
          <Select value={type} onValueChange={setType as (s: string) => void}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(scheme.flows).map((key) => {
                const { name, description } = FlowTypes[key as FlowType];

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
            type === 'implicit') && (
            <fieldset className="flex flex-col gap-1.5">
              <label htmlFor="client_id" className={cn(labelVariants())}>
                Client ID
              </label>
              <p className="text-fd-muted-foreground text-sm">
                The client ID of your OAuth application.
              </p>
              <Input
                id="client_id"
                placeholder="Enter value"
                type="text"
                autoComplete="off"
                disabled={isLoading}
                {...form.register('clientId', { required: true })}
              />
            </fieldset>
          )}
          {(type === 'authorizationCode' || type === 'clientCredentials') && (
            <fieldset className="flex flex-col gap-1.5">
              <label htmlFor="client_secret" className={cn(labelVariants())}>
                Client Secret
              </label>
              <p className="text-fd-muted-foreground text-sm">
                The client secret of your OAuth application.
              </p>
              <Input
                id="client_secret"
                placeholder="Enter value"
                type="password"
                autoComplete="off"
                disabled={isLoading}
                {...form.register('clientSecret', { required: true })}
              />
            </fieldset>
          )}
          {type === 'password' && (
            <>
              <fieldset className="flex flex-col gap-1.5">
                <label htmlFor="username" className={cn(labelVariants())}>
                  Username
                </label>
                <Input
                  id="username"
                  placeholder="Enter value"
                  type="text"
                  disabled={isLoading}
                  autoComplete="off"
                  {...form.register('username', { required: true })}
                />
              </fieldset>
              <fieldset className="flex flex-col gap-1.5">
                <label htmlFor="password" className={cn(labelVariants())}>
                  Client Secret
                </label>
                <Input
                  id="password"
                  placeholder="Enter value"
                  type="password"
                  autoComplete="off"
                  disabled={isLoading}
                  {...form.register('password', { required: true })}
                />
              </fieldset>
            </>
          )}
          {error ? (
            <p className="text-red-400 font-medium text-sm">{String(error)}</p>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              buttonVariants({
                color: 'primary',
              }),
            )}
          >
            {authCodeCallback.isLoading ? 'Fetching token...' : 'Submit'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const OauthDialogTrigger = DialogTrigger;
