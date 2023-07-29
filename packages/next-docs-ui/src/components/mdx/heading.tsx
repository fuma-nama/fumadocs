import clsx from "clsx";
import { LinkIcon } from "lucide-react";
import { ComponentPropsWithoutRef } from "react";

type Types = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingProps<T extends Types> = Omit<ComponentPropsWithoutRef<T>, "as"> & {
    as?: T;
};

export function Heading<T extends Types = "h1">({
    id,
    as,
    ...props
}: HeadingProps<T>) {
    const As = as ?? "h1";

    return (
        <As {...props} className={clsx("nd-group", props.className)}>
            <span id={id} className="nd-absolute -nd-mt-20" />
            {props.children}
            <a
                href={`#${id}`}
                className="nd-opacity-0 group-hover:nd-opacity-100 nd-inline-block nd-ml-2 nd-text-muted-foreground"
                aria-label="Link to section"
            >
                <LinkIcon className="nd-w-4 nd-h-4" />
            </a>
        </As>
    );
}
