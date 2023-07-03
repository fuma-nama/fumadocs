import { ReactNode } from "react";
import { SidebarList, SidebarProvider } from "@/components/sidebar";
import clsx from "clsx";
import { tree } from "@/utils/page-tree";

export type Param = {
    slug?: string[];
};

export default function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <div
                className={clsx(
                    "grid grid-cols-1 gap-12 mx-auto w-full max-w-wider min-h-screen px-8",
                    "lg:grid-cols-[250px_auto] xl:grid-cols-[300px_auto_150px] 2xl:grid-cols-[300px_auto_300px]",
                    "sm:px-14 xl:px-24"
                )}
            >
                <SidebarList items={tree} />
                {children}
            </div>
        </SidebarProvider>
    );
}
