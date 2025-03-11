import { useState, useRef, useEffect } from "react";
import throttle from "lodash/fp/throttle";

interface HeaderDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  mobileOnly?: boolean;
  onOpen?: () => void;
}

export function HeaderDropdown({
  trigger,
  children,
  align = "right",
  mobileOnly = false,
  onOpen,
}: HeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    // Throttle resize handler to run at most once every 150ms
    const handleResize = throttle(150, () => {
      if (mobileOnly && window.innerWidth >= 640) {
        // 640px is the sm breakpoint
        setIsOpen(false);
      }
    });

    document.addEventListener("mousedown", handleClickOutside);
    if (mobileOnly) {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (mobileOnly) {
        window.removeEventListener("resize", handleResize);
        // Clean up the throttled function
        handleResize.cancel();
      }
    };
  }, [mobileOnly]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen && onOpen) {
      onOpen();
    }
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
        className={`${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } fixed ${
          align === "right"
            ? "right-4 sm:right-6 lg:right-8"
            : "left-4 sm:left-6 lg:left-8"
        } top-16 min-w-[200px] bg-primary-800 shadow-lg border border-primary-700 rounded-b-lg transition-opacity duration-200 ease-out`}
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
