import { Link, LinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";
import { buttonStyles } from "./button-styles";

interface LinkButtonProps extends LinkProps {
  variant?: keyof typeof buttonStyles.variants;
  size?: keyof typeof buttonStyles.sizes;
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
        buttonStyles.base,
        buttonStyles.variants[variant],
        buttonStyles.sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
