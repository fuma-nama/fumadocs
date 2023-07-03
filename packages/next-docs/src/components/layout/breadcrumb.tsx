import { TreeNode } from "@/lib/generate-tree";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

type Item = {
    name: string;
    url: string | null;
};

export function useBreadcrumb({ tree }: { tree: TreeNode[] }) {
    const pathname = usePathname();

    return useMemo(() => {
        const items: Item[] = [];
        let root: TreeNode[] = tree;
        const segments = pathname.split("/");

        for (let i = 2; i <= segments.length; i++) {
            const segment = segments[i] ?? undefined;
            const node = root.find((node) => {
                if (node.type === "page" || node.type === "folder") {
                    return node.url.split("/")[i] === segment;
                }

                return false;
            });

            if (node == null || node.type === "separator") break;
            items.push({
                name: node.name,
                url:
                    node.type === "folder" && node.index == null
                        ? null
                        : node.url,
            });

            if (node.type === "folder") {
                root = node.children;
            } else {
                break;
            }
        }

        return items;
    }, [tree, pathname]);
}
