"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-zinc-900/70 p-0 text-muted-foreground border border-zinc-800/70 shadow-sm",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 font-medium transition-all",
      // better dark contrast + hover
      "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
      // focus-visible styles
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
      // disabled
      "disabled:pointer-events-none disabled:opacity-50",
      // active state
      "data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Segmented style variants (new) for compact square/segment tab style
const SegmentedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/40 p-0 overflow-hidden text-xs font-medium",
      className
    )}
    {...props}
  />
))
SegmentedTabsList.displayName = "SegmentedTabsList"

const SegmentedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // base layout
      "inline-flex h-8 min-w-[52px] items-center justify-center px-4 tracking-wide uppercase transition-colors",
      // visual
      "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/60",
      // active state overrides default violet style
      "data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-none",
      // borders between segments
      "border-r border-zinc-800 last:border-r-0",
      // remove rounding for middle segments
      "rounded-none first:rounded-l-md last:rounded-r-md",
      // focus & disabled
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
SegmentedTabsTrigger.displayName = "SegmentedTabsTrigger"

// Underline style variant for subtle inner tabs (Add/Remove)
const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center gap-6 border-b border-zinc-700 px-2 h-9",
      className
    )}
    {...props}
  />
))
UnderlineTabsList.displayName = "UnderlineTabsList"

const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center h-9 px-1 text-sm sm:text-lg font-medium",
      "text-zinc-400 hover:text-zinc-200",
      // active color + underline bar
      "data-[state=active]:text-white",
      "after:absolute after:inset-x-0 after:-bottom-[2px] after:h-[1.5px] after:rounded after:bg-purple-500 after:opacity-0 data-[state=active]:after:opacity-100",
      // focus/disabled
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
UnderlineTabsTrigger.displayName = "UnderlineTabsTrigger"

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SegmentedTabsList,
  SegmentedTabsTrigger,
  UnderlineTabsList,
  UnderlineTabsTrigger
}
