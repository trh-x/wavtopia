import { Link, LinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";

interface LinkButtonProps extends LinkProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function LinkButton({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-primary-600 text-white hover:bg-primary-700 shadow-sm border border-transparent text-sm":
            variant === "default",
          "border border-gray-300 hover:bg-gray-50": variant === "outline",
          "hover:bg-gray-100": variant === "ghost",
          "h-9 px-3.5 py-2": size === "default",
          "h-7 px-2 py-1": size === "sm",
          "h-10 px-4 py-2": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
