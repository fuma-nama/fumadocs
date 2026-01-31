export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Awaitable<T> = T | PromiseLike<T>;
export type MakeOptional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
