"use client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

export type LanguageSelectProps = {
    value: string;
    languages: { name: string; locale: string }[];

    /**
     * Where the `lang` parameter located, starting from 1.
     *
     * For example: `/[lang]/docs` is 1 and `/somewhere/[lang]/docs` is 2
     */
    paramIndex: number;
};

export function LanguageSelect(props: LanguageSelectProps) {
    const router = useRouter();
    const pathname = usePathname();

    const onChange = useCallback(
        (locale: string) => {
            const segments = pathname.split("/");
            segments[props.paramIndex] = locale;
            router.push(segments.join("/"));
        },
        [router, pathname]
    );

    return (
        <Select value={props.value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {props.languages.map((lang) => (
                    <SelectItem key={lang.locale} value={lang.locale}>
                        {lang.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
