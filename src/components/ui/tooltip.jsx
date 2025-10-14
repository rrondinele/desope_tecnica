import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef(
  ({ className, side = "top", sideOffset = 6, align = "center", ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-lg border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        // animações (remova se não usar tailwind-animate)
        "motion-safe:data-[state=delayed-open]:data-[side=top]:animate-in motion-safe:data-[state=delayed-open]:data-[side=top]:slide-in-from-bottom-1",
        "motion-safe:data-[state=delayed-open]:data-[side=bottom]:animate-in motion-safe:data-[state=delayed-open]:data-[side=bottom]:slide-in-from-top-1",
        "motion-safe:data-[state=delayed-open]:data-[side=left]:animate-in motion-safe:data-[state=delayed-open]:data-[side=left]:slide-in-from-right-1",
        "motion-safe:data-[state=delayed-open]:data-[side=right]:animate-in motion-safe:data-[state=delayed-open]:data-[side=right]:slide-in-from-left-1",
        className
      )}
      {...props}
    >
      {props.children}
      <TooltipPrimitive.Arrow className="fill-popover drop-shadow" />
    </TooltipPrimitive.Content>
  )
);
TooltipContent.displayName = "TooltipContent";
