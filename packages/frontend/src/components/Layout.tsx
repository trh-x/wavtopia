import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="min-h-screen">
      <nav className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold">
                Wavtopia
              </Link>
              {isAdmin && (
                <div className="flex items-center gap-2 ml-8">
                  <Link
                    to="/admin/feature-flags"
                    className="text-sm hover:text-primary-200"
                  >
                    Feature Flags
                  </Link>
                  <Link
                    to="/admin/invite-codes"
                    className="text-sm hover:text-primary-200"
                  >
                    Invite Codes
                  </Link>
                </div>
              )}
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/upload"
                  className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Upload Track
                </Link>
                <NotificationBell />
                <span className="text-sm">{user.username}</span>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Logout
                </button>
              </div>
            ) : (
              !isLoginPage && (
                <Link
                  to="/login"
                  className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Login
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
