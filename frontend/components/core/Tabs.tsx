"use client";

import * as React from "react";
import {
  Tabs as BaseTabs,
  TabsList as BaseTabsList,
  TabsTrigger as BaseTabsTrigger,
  TabsContent as BaseTabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type TabsProps = React.ComponentProps<typeof BaseTabs>;
export type TabsListProps = React.ComponentProps<typeof BaseTabsList>;
export type TabsTriggerProps = React.ComponentProps<typeof BaseTabsTrigger>;
export type TabsContentProps = React.ComponentProps<typeof BaseTabsContent>;

export function Tabs({ className, ...props }: TabsProps) {
  return <BaseTabs className={cn("w-full", className)} {...props} />;
}

export function TabsList({ className, ...props }: TabsListProps) {
  return <BaseTabsList className={cn(className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return <BaseTabsTrigger className={cn("cursor-pointer font-medium", className)} {...props} />;
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <BaseTabsContent className={cn("mt-4", className)} {...props} />;
}
