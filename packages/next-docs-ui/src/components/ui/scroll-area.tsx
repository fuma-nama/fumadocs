import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/utils/cn";

const ScrollArea = React.forwardRef<
    React.ElementRef<typeof ScrollAreaPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("nd-relative nd-overflow-hidden", className)}
        {...props}
    >
        <ScrollAreaPrimitive.Viewport className="nd-h-full nd-w-full nd-rounded-[inherit]">
            {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
    React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
    React.ComponentPropsWithoutRef<
        typeof ScrollAreaPrimitive.ScrollAreaScrollbar
    >
>(({ className, orientation = "vertical", ...props }, ref) => (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
        ref={ref}
        orientation={orientation}
        className={cn(
            "nd-flex nd-touch-none nd-select-none",
            orientation === "vertical" && "nd-h-full nd-w-1",
            orientation === "horizontal" && "nd-h-1",
            className
        )}
        {...props}
    >
        <ScrollAreaPrimitive.ScrollAreaThumb className="nd-relative nd-flex-1 nd-rounded-full nd-bg-border" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
