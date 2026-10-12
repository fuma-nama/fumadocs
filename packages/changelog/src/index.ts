export interface ChangelogEntry {
  /** unique, e.g. a release tag */
  id: string;
  title: string;
  date: Date;
  /** released packages, like `fumadocs-ui@16.17.0` */
  versions?: { name: string; version: string }[];
  /** URL of the entry, e.g. a GitHub release */
  url?: string;
  /** content in Markdown */
  content?: string;
}
