import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <nav className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold">
              Wavtopia
            </Link>
            {user && (
              <div className="flex items-center gap-4">
                <Link
                  to="/upload"
                  className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Upload Track
                </Link>
                <span className="text-sm">{user.username}</span>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Logout
                </button>
              </div>
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
