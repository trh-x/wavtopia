import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { TrackDetails } from "@/pages/TrackDetails";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { UploadTrack } from "@/pages/UploadTrack";
import { MyTracks } from "./pages/MyTracks";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/AdminRoute";
import { Admin } from "@/pages/Admin/Admin";
import { RequestEarlyAccess } from "@/pages/RequestEarlyAccess";
import Notifications from "@/pages/Notifications";
import { BulkUploadTrack } from "./pages/BulkUploadTrack";
import { useInitializeFeatureFlags } from "./hooks/useFeatureFlags";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { EditTrack } from "@/pages/EditTrack";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/request-early-access" element={<RequestEarlyAccess />} />
        <Route path="/" element={<Home />} />
        <Route path="/track/:id" element={<TrackDetails />} />
        <Route
          path="/track/:id/edit"
          element={
            <PrivateRoute>
              <EditTrack />
            </PrivateRoute>
          }
        />
        <Route path="/my-tracks" element={<MyTracks />} />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <UploadTrack />
            </PrivateRoute>
          }
        />
        <Route
          path="/upload/bulk"
          element={
            <PrivateRoute>
              <BulkUploadTrack />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  useInitializeFeatureFlags();

  return (
    <Router>
      <TooltipProvider>
        <AuthProvider>
          <NotificationsProvider>
            <AppRoutes />
          </NotificationsProvider>
        </AuthProvider>
      </TooltipProvider>
    </Router>
  );
}
