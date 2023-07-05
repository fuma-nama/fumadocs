import type { ComponentPropsWithoutRef, ElementType } from "react";

export type WithAs<T extends ElementType, Extend = {}> = Omit<
    ComponentPropsWithoutRef<T>,
    "as" | keyof Extend
> &
    Extend & {
        as?: T;
    };
