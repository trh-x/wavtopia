import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import {
  HeaderDropdownTrigger,
  HeaderDropdownMenu,
  HeaderDropdownItem,
} from "@/components/ui/HeaderDropdown";
import {
  HeaderDropdownProvider,
  useHeaderDropdown,
} from "@/contexts/HeaderDropdownContext";

interface LayoutProps {
  children: React.ReactNode;
}

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isAdmin = user?.role === "ADMIN"; // TODO: Get this const from prisma code.
  const { openDropdownId, setOpenDropdownId } = useHeaderDropdown();

  const getNavItemClass = (path: string) => {
    const isActive = location.pathname === path;
    return `px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
      isActive ? "bg-primary-900" : "bg-primary-700 hover:bg-primary-800"
    }`;
  };

  const navItems = (
    <>
      <HeaderDropdownItem>
        <Link to="/my-tracks" className="block">
          My Tracks
        </Link>
      </HeaderDropdownItem>
      <HeaderDropdownItem>
        <Link to="/upload" className="block">
          Upload Track
        </Link>
      </HeaderDropdownItem>
    </>
  );

  return (
    <nav
      className={`bg-primary-600 text-white relative z-10 ${
        openDropdownId ? "sticky top-0" : ""
      }`}
      onMouseDown={(e) => {
        if (openDropdownId) {
          // Stop the click event from bubbling up to the parent elements, to
          // prevent the header from being made unsticky prematurely due to a
          // click on the document.
          // @see https://github.com/trh-x/wavtopia/blob/f3cf3881ae1dbd932054ac15612bd2b03fd1566f/packages/frontend/src/contexts/HeaderDropdownContext.tsx#L61-L62
          e.stopPropagation();
        }
      }}
      onClick={() => {
        if (openDropdownId) {
          // Close any open dropdown when the header is clicked. The individual
          // dropdowns will stop propagation of the click event before it bubbles
          // up to the header, to ensure they don't close.
          setOpenDropdownId(null);
        }
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Left - Brand */}
          <div className="flex-none">
            <Link to="/" className="text-xl font-bold whitespace-nowrap">
              Wavtopia
            </Link>
          </div>

          {/* Right - User Navigation */}
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4">
                <Link to="/my-tracks" className={getNavItemClass("/my-tracks")}>
                  My Tracks
                </Link>
                <Link to="/upload" className={getNavItemClass("/upload")}>
                  Upload Track
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <HeaderDropdownTrigger
                  id="user-menu"
                  trigger={
                    <button className="flex items-center gap-1 hover:text-primary-200">
                      <span className="text-sm whitespace-nowrap">
                        {user.username}
                      </span>
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  }
                />
                <HeaderDropdownMenu id="user-menu">
                  {isAdmin && (
                    <HeaderDropdownItem>
                      <Link to="/admin" className="block">
                        Admin Dashboard
                      </Link>
                    </HeaderDropdownItem>
                  )}
                  <HeaderDropdownItem onClick={logout}>
                    Logout
                  </HeaderDropdownItem>
                </HeaderDropdownMenu>
              </div>
              <HeaderDropdownTrigger
                id="mobile-menu"
                trigger={
                  <button className="sm:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-primary-700 focus:outline-none">
                    <span className="sr-only">Toggle menu</span>
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                }
                mobileOnly
              />
              <HeaderDropdownMenu id="mobile-menu">
                {navItems}
              </HeaderDropdownMenu>
            </div>
          ) : (
            !isLoginPage && (
              <Link
                to="/login"
                className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800 whitespace-nowrap"
              >
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <HeaderDropdownProvider>
        <Header />
      </HeaderDropdownProvider>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
