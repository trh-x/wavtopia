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
        <Route path="/" element={<Home />} />
        <Route path="/track/:id" element={<TrackDetails />} />
        <Route path="/my-tracks" element={<MyTracks />} />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <UploadTrack />
            </PrivateRoute>
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
