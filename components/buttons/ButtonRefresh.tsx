"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonRefreshProps {
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ButtonRefresh({ loading, onRefresh, className }: ButtonRefreshProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onRefresh}
      disabled={loading}
      className={cn(
        "bg-zinc-800 h-5 w-5 hover:bg-purple-500 text-zinc-500 hover:text-white items-center",
        loading && "animate-spin",
        className
      )}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}