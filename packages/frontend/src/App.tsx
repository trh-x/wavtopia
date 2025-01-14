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
import { FeatureFlagsProvider } from "./hooks/useFeatureFlags";
import { AdminRoute } from "@/components/AdminRoute";
import { FeatureFlagsAdmin } from "@/pages/Admin/FeatureFlags";
import { InviteCodesAdmin } from "@/pages/Admin/InviteCodes";
import { RequestEarlyAccess } from "@/pages/RequestEarlyAccess";
import Notifications from "@/pages/Notifications";

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
          path="/admin/feature-flags"
          element={
            <AdminRoute>
              <FeatureFlagsAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/invite-codes"
          element={
            <AdminRoute>
              <InviteCodesAdmin />
            </AdminRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <FeatureFlagsProvider>
          <AppRoutes />
        </FeatureFlagsProvider>
      </AuthProvider>
    </Router>
  );
}
