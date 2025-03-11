import { useState, useRef, useEffect } from "react";
import throttle from "lodash/fp/throttle";

interface HeaderDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  mobileOnly?: boolean;
}

export function HeaderDropdown({
  trigger,
  children,
  align = "right",
  mobileOnly = false,
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

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      <div
        className={`${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } fixed ${
          align === "right" ? "right-4" : "left-4"
        } top-16 min-w-[200px] bg-primary-800 shadow-lg border border-primary-700 rounded-b-lg transition-opacity duration-200 ease-out`}
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
