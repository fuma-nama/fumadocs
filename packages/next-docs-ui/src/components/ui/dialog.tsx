/** Generated with Shadcn UI */
import { cn } from '@/utils/cn'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = ({
  className,
  ...props
}: DialogPrimitive.DialogPortalProps) => (
  <DialogPrimitive.Portal className={cn(className)} {...props} />
)
DialogPortal.displayName = DialogPrimitive.Portal.displayName

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'nd-fixed nd-inset-0 nd-z-50 nd-bg-background/80 nd-backdrop-blur-sm data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out data-[state=open]:nd-fade-in',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'nd-fixed nd-left-[50%] nd-top-[50%] nd-z-50 nd-grid nd-w-full nd-max-w-lg nd-translate-x-[-50%] nd-translate-y-[-50%] nd-gap-4 nd-border nd-bg-background nd-p-6 nd-shadow-lg nd-duration-200 data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out data-[state=open]:nd-fade-in data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[state=closed]:nd-slide-out-to-left-1/2 data-[state=closed]:nd-slide-out-to-top-[48%] data-[state=open]:nd-slide-in-from-left-1/2 data-[state=open]:nd-slide-in-from-top-[48%] sm:nd-rounded-lg md:nd-w-full',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="nd-absolute nd-right-4 nd-top-4 nd-rounded-sm nd-opacity-70 nd-ring-offset-background nd-transition-opacity hover:nd-opacity-100 focus:nd-outline-none focus:nd-ring-2 focus:nd-ring-ring focus:nd-ring-offset-2 disabled:nd-pointer-events-none data-[state=open]:nd-bg-accent data-[state=open]:nd-text-muted-foreground">
        <X className="nd-h-4 nd-w-4" />
        <span className="nd-sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'nd-flex nd-flex-col nd-space-y-1.5 nd-text-center sm:nd-text-left',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'nd-flex nd-flex-col-reverse sm:nd-flex-row sm:nd-justify-end sm:nd-space-x-2',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'nd-text-lg nd-font-semibold nd-leading-none nd-tracking-tight',
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('nd-text-sm nd-text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
