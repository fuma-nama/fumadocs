import type { unstable_RSCRouteConfigEntry as RSCRouteConfigEntry } from 'react-router';

type RouteConfigParentEntry = Exclude<RSCRouteConfigEntry, { index: true }>;

export interface RoutesConfig {
  /**
   * the root entry
   */
  root?: RouteConfigParentEntry;

  /**
   * Layout name -> layout entry
   */
  layouts?: Record<string, RouteConfigParentEntry>;

  /**
   * entry for content pages
   */
  page?: RSCRouteConfigEntry;

  /**
   * Add additional entries
   */
  extends?: RSCRouteConfigEntry;
}

export function defineRoutes(config: RoutesConfig): RoutesConfig {
  return config;
}
