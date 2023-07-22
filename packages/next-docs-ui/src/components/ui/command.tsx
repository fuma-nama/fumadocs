"use client";
import * as React from "react";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { DialogProps } from "@radix-ui/react-dialog";

import { cn } from "@/utils/cn";
import { Dialog, DialogContent } from "./dialog";

const Command = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn(
            "nd-flex nd-h-full nd-w-full nd-flex-col nd-overflow-hidden nd-rounded-md nd-bg-popover nd-text-popover-foreground",
            className
        )}
        {...props}
    />
));
Command.displayName = CommandPrimitive.displayName;

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
    return (
        <Dialog {...props}>
            <DialogContent className="nd-overflow-hidden nd-p-0 nd-shadow-2xl">
                <Command
                    className="[&_[cmdk-group-heading]]:nd-px-2 [&_[cmdk-group-heading]]:nd-font-medium [&_[cmdk-group-heading]]:nd-text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:nd-pt-0 [&_[cmdk-group]]:nd-px-2 [&_[cmdk-input-wrapper]_svg]:nd-h-5 [&_[cmdk-input-wrapper]_svg]:nd-w-5 [&_[cmdk-input]]:nd-h-12 [&_[cmdk-item]]:nd-px-2 [&_[cmdk-item]]:nd-py-3 [&_[cmdk-item]_svg]:nd-h-5 [&_[cmdk-item]_svg]:nd-w-5"
                    shouldFilter={false}
                >
                    {children}
                </Command>
            </DialogContent>
        </Dialog>
    );
};

const CommandInput = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Input>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
    <div
        className="nd-flex nd-items-center nd-border-b nd-px-3"
        cmdk-input-wrapper=""
    >
        <Search className="nd-mr-2 nd-h-4 nd-w-4 nd-shrink-0 nd-opacity-50" />
        <CommandPrimitive.Input
            ref={ref}
            className={cn(
                "placeholder:nd-text-foreground-muted nd-flex nd-h-11 nd-w-full nd-rounded-md nd-bg-transparent nd-py-3 nd-text-sm nd-outline-none disabled:nd-cursor-not-allowed disabled:nd-opacity-50",
                className
            )}
            {...props}
        />
    </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.List
        ref={ref}
        className={cn(
            "nd-max-h-[300px] nd-overflow-y-auto nd-overflow-x-hidden",
            className
        )}
        {...props}
    />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Empty>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
    <CommandPrimitive.Empty
        ref={ref}
        className="nd-py-6 nd-text-center nd-text-sm"
        {...props}
    />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Group>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={cn(
            "nd-overflow-hidden nd-p-1 nd-text-foreground [&_[cmdk-group-heading]]:nd-px-2 [&_[cmdk-group-heading]]:nd-py-1.5 [&_[cmdk-group-heading]]:nd-text-xs [&_[cmdk-group-heading]]:nd-font-medium [&_[cmdk-group-heading]]:nd-text-muted-foreground",
            className
        )}
        {...props}
    />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Separator
        ref={ref}
        className={cn("-nd-mx-1 nd-h-px nd-bg-border", className)}
        {...props}
    />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={cn(
            "nd-relative nd-flex nd-cursor-pointer nd-select-none nd-items-center nd-rounded-sm nd-px-2 nd-py-1.5 nd-text-sm nd-outline-none aria-selected:nd-bg-accent aria-selected:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50",
            className
        )}
        {...props}
    />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
};
