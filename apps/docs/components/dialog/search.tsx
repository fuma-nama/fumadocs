import { DialogProps } from "@radix-ui/react-dialog";
import { useDocsSearch } from "next-docs/search";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "../ui/command";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { BookOpenIcon } from "lucide-react";

export default function SearchDialog(props: DialogProps) {
    const router = useRouter();
    const { search, setSearch, query } = useDocsSearch();

    const onOpen = useCallback(
        (v: string) => {
            router.push(v);
            props.onOpenChange?.(false);
        },
        [router]
    );

    return (
        <CommandDialog {...props}>
            <CommandInput
                placeholder="Type a command or search..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {query.data != "empty" &&
                    query.data != null &&
                    query.data.length !== 0 && (
                        <CommandGroup heading="Documents">
                            {query.data.map((item) => (
                                <CommandItem
                                    key={item.id[0]}
                                    value={item.doc.url}
                                    onSelect={onOpen}
                                >
                                    {item.doc.title}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                <CommandSeparator />
                {query.data === "empty" && (
                    <CommandGroup heading="Links">
                        {[
                            ["Home", "/"],
                            ["Documentation", "/docs"],
                        ].map(([name, url], i) => (
                            <CommandItem key={i} value={url} onSelect={onOpen}>
                                <BookOpenIcon className="w-5 h-5 mr-2" />
                                {name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
