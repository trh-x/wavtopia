import { useState, useRef, useEffect } from "react";

interface HeaderDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function HeaderDropdown({
  trigger,
  children,
  align = "right",
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
