import clsx from "clsx";
import { CheckIcon, CopyIcon } from "lucide-react";
import { ComponentProps, useRef, useState, useEffect } from "react";

export function Pre(props: ComponentProps<"pre">) {
    const ref = useRef<HTMLPreElement>(null);
    const onCopy = () => {
        if (ref.current == null || ref.current.textContent == null) return;

        navigator.clipboard.writeText(ref.current.textContent);
    };

    return (
        <div className="nd-not-prose" data-rehype-pretty-code-block>
            <CopyButton onCopy={onCopy} />
            <pre
                {...props}
                className={clsx("nd-codeblock", props.className)}
                ref={ref}
            >
                {props.children}
            </pre>
        </div>
    );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
    const [checked, setChecked] = useState(false);

    const onClick = () => {
        onCopy();
        setChecked(true);
    };

    useEffect(() => {
        if (!checked) return;

        const timer = setTimeout(() => {
            setChecked(false);
        }, 1500);

        return () => {
            clearTimeout(timer);
        };
    }, [checked]);

    return (
        <button
            className="nd-absolute nd-top-1 nd-right-1 nd-p-2 nd-border nd-bg-secondary nd-text-secondary-foreground nd-transition-colors nd-rounded-md hover:nd-bg-accent"
            onClick={onClick}
        >
            {checked ? (
                <CheckIcon className="nd-w-3 nd-h-3" />
            ) : (
                <CopyIcon className="nd-w-3 nd-h-3" />
            )}
        </button>
    );
}
