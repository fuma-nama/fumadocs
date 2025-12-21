export interface Cache {
  read: (key: string) => unknown | undefined | Promise<unknown | undefined>;
  write: (key: string, value: unknown) => void | Promise<void>;
}
