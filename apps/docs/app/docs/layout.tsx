import { ReactNode } from "react";
import { tree } from "@/utils/page-tree";
import { DocsLayout } from "next-docs-ui/layout";

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <DocsLayout
            tree={tree}
            navTitle="Next Docs"
            githubUrl="https://www.npmjs.com/package/next-docs-zeta"
        >
            <div className="absolute inset-0 -z-[1] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-purple-400/20 to-background to-50%" />
            </div>
            {children}
        </DocsLayout>
    );
}
