import { ReactNode } from "react";
import { SidebarProvider, Sidebar } from "@/components/sidebar";
import clsx from "clsx";
import { tree } from "@/utils/page-tree";

export type Param = {
    slug?: string[];
};

export default function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <div className="absolute inset-0 -z-[1] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-purple-400/20 to-background to-50%" />
            </div>
            <div
                className={clsx(
                    "grid grid-cols-1 gap-12 mx-auto w-full max-w-wider min-h-screen px-8",
                    "lg:grid-cols-[250px_auto] xl:grid-cols-[300px_auto_150px] 2xl:grid-cols-[300px_auto_300px]",
                    "sm:px-14 xl:px-24"
                )}
            >
                <Sidebar items={tree} />
                {children}
            </div>
        </SidebarProvider>
    );
}
