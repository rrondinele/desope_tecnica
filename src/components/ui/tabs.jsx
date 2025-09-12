// src/components/ui/tabs.jsx
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/utils"; // ou use sua função de classe condicional

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn("inline-flex gap-2 bg-gray-100 p-1 rounded", className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      "px-3 py-2 rounded text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow",
      className
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }) => (
  <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />
);
