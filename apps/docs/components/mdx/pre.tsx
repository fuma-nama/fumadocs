"use client";
import { CheckIcon, CopyIcon } from "lucide-react";
import { ComponentProps, useRef, useState, useEffect } from "react";

export function Pre(props: ComponentProps<"pre">) {
    const ref = useRef<HTMLPreElement>(null);
    const onCopy = () => {
        if (ref.current == null || ref.current.textContent == null) return;

        navigator.clipboard.writeText(ref.current.textContent);
    };

    return (
        <div className="relative">
            <CopyButton onCopy={onCopy} />
            <pre {...props} ref={ref}>
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
            className="absolute top-1 right-1 p-2 bg-secondary text-secondary-foreground border-[1px] rounded-md"
            onClick={onClick}
        >
            {checked ? (
                <CheckIcon className="w-3 h-3" />
            ) : (
                <CopyIcon className="w-3 h-3" />
            )}
        </button>
    );
}
