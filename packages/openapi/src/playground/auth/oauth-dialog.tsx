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

export interface AuthDialogProps {
  flow: keyof OpenAPIV3_1.OAuth2SecurityScheme['flows'];
  scheme: OpenAPIV3_1.OAuth2SecurityScheme;

  setToken: (token: string) => void;
  children: React.ReactNode;
}

interface FormValues {
  clientId: string;
  clientSecret: string;
}

interface OAuthState {
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}

export function OauthDialog({
  flow,
  scheme,
  setToken,
  children,
}: AuthDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      clientId: '',
      clientSecret: '',
    },
  });

  const tokenQuery = useQuery(async (code: string, state: OAuthState) => {
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
    const { access_token } = (await res.json()) as {
      access_token: string;
    };

    setToken(access_token);
    setOpen(false);
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state || flow !== 'authorizationCode') return;

    const parsedState = JSON.parse(state) as OAuthState;

    setOpen(true);
    form.setValue('clientId', parsedState.client_id);
    form.setValue('clientSecret', parsedState.client_secret);
    tokenQuery.start(code, parsedState);
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first page load only
  }, []);

  const authorize = useQuery(async (values: FormValues) => {
    if (flow === 'authorizationCode') {
      const value = scheme.flows[flow]!;

      const params = new URLSearchParams();
      params.set('response_type', 'code');
      params.set('client_id', values.clientId);
      params.set('redirect_uri', window.location.href);
      params.set('scope', Object.keys(value.scopes).join('+'));
      params.set(
        'state',
        JSON.stringify({
          client_id: values.clientId,
          client_secret: values.clientSecret,
          redirect_uri: window.location.href,
        } satisfies OAuthState),
      );

      window.location.replace(`${value.authorizationUrl}?${params.toString()}`);
    }

    if (flow === 'clientCredentials') {
      const value = scheme.flows[flow]!;

      await fetch(value.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: Object.keys(value.scopes).join('+'),
        }),
      });
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    return authorize.start(values);
  });

  const isLoading = authorize.isLoading || tokenQuery.isLoading;

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
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          {(flow === 'authorizationCode' || flow === 'clientCredentials') && (
            <>
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
                  disabled={isLoading}
                  {...form.register('clientId', { required: true })}
                />
              </fieldset>
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
                  disabled={isLoading}
                  {...form.register('clientSecret', { required: true })}
                />
              </fieldset>
            </>
          )}
          {tokenQuery.error ? (
            <p className="text-red-400 font-medium text-sm">
              {String(tokenQuery.error)}
            </p>
          ) : null}
          <button
            disabled={isLoading}
            className={cn(
              buttonVariants({
                color: 'primary',
              }),
            )}
          >
            {tokenQuery.isLoading ? 'Fetching token...' : 'Submit'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const OauthDialogTrigger = DialogTrigger;
