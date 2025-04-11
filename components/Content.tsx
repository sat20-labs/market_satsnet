import { Spinner } from "@nextui-org/react";
import React from "react";

interface ContentProps {
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}
export const Content = ({
  loading = true,
  className,
  children,
}: ContentProps) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Spinner />
        </div>
      )}
    </div>
  );
};
