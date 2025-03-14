import { useRef, useEffect } from "react";
import { useHeaderDropdown } from "@/contexts/HeaderDropdownContext";
import { cn } from "@/utils/cn";

interface HeaderDropdownProps {
  id: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  mobileOnly?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function HeaderDropdown({
  id,
  trigger,
  children,
  align = "right",
  mobileOnly = false,
  onOpenChange,
}: HeaderDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { openDropdownId, setOpenDropdownId, registerDropdownRef } =
    useHeaderDropdown();

  const isOpen = openDropdownId === id;

  useEffect(() => {
    registerDropdownRef(id, dropdownRef.current, { mobileOnly });
    return () => {
      registerDropdownRef(id, null);
    };
  }, [id, mobileOnly, registerDropdownRef]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setOpenDropdownId(newIsOpen ? id : null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={handleToggle}>{trigger}</div>
      {/* 
        Dropdown positioning:
        1. Responsive padding matches header container: right-4 sm:right-6 lg:right-8
        2. Dynamic position calculation ensures dropdown aligns with the max-w-7xl (80rem) header container:
           - On smaller screens: stays 1rem from the edge
           - On larger screens: aligns with header's max-width container edge
           - Formula: max(1rem, (viewport - header-max-width) / 2 + padding)
      */}
      <div
        className={cn(
          "fixed top-16 min-w-[200px] bg-primary-800 shadow-lg border border-primary-700 rounded-b-lg transition-all duration-200 ease-out",
          isOpen
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible",
          align === "right"
            ? "right-4 sm:right-6 lg:right-8"
            : "left-4 sm:left-6 lg:left-8"
        )}
        style={{
          maxWidth: "calc(100vw - 2rem)",
          [align === "right" ? "right" : "left"]:
            "max(1rem, calc((100vw - 80rem) / 2 + 2rem))",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HeaderDropdownItem({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`px-6 py-3 text-sm transition-colors duration-150 whitespace-nowrap block hover:bg-primary-700/50 cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}
