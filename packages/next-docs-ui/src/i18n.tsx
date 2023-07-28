"use client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useContext } from "react";
import { I18nContext } from "./contexts/i18n";

export type LanguageSelectProps = {
    languages: { name: string; locale: string }[];
};

export function LanguageSelect(props: LanguageSelectProps) {
    const context = useContext(I18nContext);

    if (context == null) {
        return <></>;
    }

    return (
        <Select value={context.locale} onValueChange={context.onChange}>
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

export const I18nProvider = I18nContext.Provider;
