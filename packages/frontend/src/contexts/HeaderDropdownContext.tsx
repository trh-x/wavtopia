import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import throttle from "lodash/fp/throttle";

interface DropdownInfo {
  ref: HTMLDivElement;
  mobileOnly: boolean;
}

interface HeaderDropdownContextType {
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  registerDropdownRef: (
    id: string,
    ref: HTMLDivElement | null,
    options?: { mobileOnly?: boolean }
  ) => void;
}

const HeaderDropdownContext = createContext<HeaderDropdownContextType | null>(
  null
);

export function useHeaderDropdown() {
  const context = useContext(HeaderDropdownContext);
  if (!context) {
    throw new Error(
      "useHeaderDropdown must be used within a HeaderDropdownProvider"
    );
  }
  return context;
}

export function HeaderDropdownProvider({ children }: { children: ReactNode }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef(new Map<string, DropdownInfo>());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!openDropdownId) return;
      setOpenDropdownId(null);
    }

    // Throttle resize handler to run at most once every 150ms
    const handleResize = throttle(150, () => {
      if (openDropdownId) {
        const activeDropdown = dropdownRefs.current.get(openDropdownId);
        if (activeDropdown?.mobileOnly && window.innerWidth >= 640) {
          // 640px is the sm breakpoint
          setOpenDropdownId(null);
        }
      }
    });

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      // Clean up the throttled function
      handleResize.cancel();
    };
  }, [openDropdownId]);

  const registerDropdownRef = (
    id: string,
    ref: HTMLDivElement | null,
    options: { mobileOnly?: boolean } = {}
  ) => {
    if (ref) {
      dropdownRefs.current.set(id, { ref, mobileOnly: !!options.mobileOnly });
    } else {
      dropdownRefs.current.delete(id);
    }
  };

  return (
    <HeaderDropdownContext.Provider
      value={{
        openDropdownId,
        setOpenDropdownId,
        registerDropdownRef,
      }}
    >
      {children}
    </HeaderDropdownContext.Provider>
  );
}
