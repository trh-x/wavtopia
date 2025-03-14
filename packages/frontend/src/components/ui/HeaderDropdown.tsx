import { useRef, useEffect } from "react";
import { useHeaderDropdown } from "@/contexts/HeaderDropdownContext";
import { cn } from "@/utils/cn";

interface HeaderDropdownTriggerProps {
  id: string;
  trigger: React.ReactNode;
  mobileOnly?: boolean;
}

interface HeaderDropdownMenuProps {
  id: string;
  children: React.ReactNode;
  align?: "left" | "right";
  closeOnClick?: boolean;
}

export function HeaderDropdownTrigger({
  id,
  trigger,
  mobileOnly = false,
}: HeaderDropdownTriggerProps) {
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setOpenDropdownId(newIsOpen ? id : null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={handleToggle}>{trigger}</div>
    </div>
  );
}

export function HeaderDropdownMenu({
  id,
  children,
  align = "right",
  closeOnClick = true,
}: HeaderDropdownMenuProps) {
  const { openDropdownId } = useHeaderDropdown();
  const isOpen = openDropdownId === id;

  return (
    <div
      className={cn(
        "absolute min-w-[200px] bg-primary-800 shadow-lg border border-primary-700 rounded-b-lg",
        "top-[calc(100%-1px)]",
        "transition-[opacity,visibility] duration-200 ease-out",
        isOpen
          ? "opacity-100 pointer-events-auto visible"
          : "opacity-0 pointer-events-none invisible"
      )}
      style={{
        maxWidth: "calc(100vw - 2rem)",
        // Aligns the dropdown with the header's max-width container (80rem):
        // - On smaller screens (<82rem), keeps dropdown 1rem from screen edge
        // - On larger screens, aligns with the header's content by calculating
        //   the space between viewport edge and header container (100vw - 80rem)/2,
        //   then adding 2rem to match header's padding
        [align === "right" ? "right" : "left"]:
          "max(1rem, calc((100vw - 80rem) / 2 + 2rem))",
      }}
      onClick={(e) => {
        if (!closeOnClick) {
          // Stop the click event from bubbling up to the parent elements, as the Header
          // will otherwise close the dropdown.
          e.stopPropagation();
        }
      }}
    >
      {children}
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
      className={cn(
        "px-6 py-3 text-sm transition-colors duration-150 whitespace-nowrap block hover:bg-primary-700/50 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
