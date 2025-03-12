import { createContext, useContext, useState, ReactNode } from "react";

interface HeaderDropdownContextType {
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
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

  return (
    <HeaderDropdownContext.Provider
      value={{
        openDropdownId,
        setOpenDropdownId,
      }}
    >
      {children}
    </HeaderDropdownContext.Provider>
  );
}
