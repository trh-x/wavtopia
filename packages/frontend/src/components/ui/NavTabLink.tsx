import { NavLink, NavLinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";

interface NavTabLinkProps extends NavLinkProps {
  activeClassName?: string;
  className?: string;
}

export function NavTabLink({
  className,
  activeClassName = "text-primary-600 border-b-2 border-primary-600 pb-1",
  children,
  ...props
}: NavTabLinkProps) {
  return (
    <NavLink
      {...props}
      className={({ isActive }) =>
        cn(
          isActive
            ? activeClassName
            : "text-gray-600 hover:text-primary-600 pb-1",
          className
        )
      }
    >
      {children}
    </NavLink>
  );
}
