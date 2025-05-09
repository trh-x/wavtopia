import { NavLink, NavLinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";
import React from "react";

interface NavTabLinkProps extends NavLinkProps {
  activeClassName?: string;
  className?: string;
}

export function NavTabLink({
  className,
  activeClassName = "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-gray-950 shadow-sm",
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
            : "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-gray-600 hover:text-gray-950",
          className
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function NavTabList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
