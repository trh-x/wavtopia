import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { TrackDetails } from "@/pages/TrackDetails";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track/:id" element={<TrackDetails />} />
        </Routes>
      </Layout>
    </Router>
  );
}
