import { cn } from "@/utils/cn";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-gray-100 text-gray-800": variant === "default",
          "bg-green-100 text-green-800": variant === "success",
          "bg-yellow-100 text-yellow-800": variant === "warning",
          "bg-red-100 text-red-800": variant === "error",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
