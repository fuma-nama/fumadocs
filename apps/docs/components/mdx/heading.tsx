import clsx from "clsx";
import { LinkIcon } from "lucide-react";
import { ComponentPropsWithoutRef, createElement } from "react";

type Types = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type InternalHeadingProps<T extends Types> = {
    as: T;
};

export function Heading<T extends Types>({
    id,
    as,
    ...props
}: Omit<ComponentPropsWithoutRef<T>, keyof InternalHeadingProps<T>> &
    InternalHeadingProps<T>) {
    return createElement(
        as,
        {
            ...props,
            className: clsx("group", props.className),
        },
        [
            <span id={id} className="absolute -mt-20" />,
            props.children,
            <a
                href={`#${id}`}
                className="opacity-0 group-hover:opacity-100 inline-block ml-2 text-muted-foreground"
            >
                <LinkIcon className="w-4 h-4" />
            </a>,
        ]
    );
}
