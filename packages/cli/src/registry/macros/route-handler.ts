import type { Awaitable } from '@/types';

export type RouteHandlerHttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

export interface StaticInfo<Params extends string, CatchAll extends string | undefined> {
  params: Params[];
  catchAll?: CatchAll;
  /**
   * HTTP verbs this route implements.
   */
  methods: readonly RouteHandlerHttpMethod[];
}

type RouteHandler<Params extends string, CatchAll extends string | undefined> = (
  request: Request,
  params: RouteHandlerParams<Params, CatchAll>,
) => Awaitable<Response>;

type RouteHandlerParams<Params extends string, CatchAll extends string | undefined> = Record<
  Params,
  string
> &
  (CatchAll extends string ? Record<CatchAll, string[] | undefined> : unknown);

export function $routeHandler<
  Params extends string,
  CatchAll extends string | undefined = undefined,
>(info: StaticInfo<Params, CatchAll>, handler: RouteHandler<NoInfer<Params>, NoInfer<CatchAll>>) {
  return {
    info,
    handler,
  };
}
