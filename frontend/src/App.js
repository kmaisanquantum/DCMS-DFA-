import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import RequestDetailPage from './pages/RequestDetailPage';
import NewRequestPage from './pages/NewRequestPage';
import ReviewPage from './pages/ReviewPage';
import VerifyPage from './pages/VerifyPage';

export default function App() {
  return (
    <Routes>
      {/* Public QR verify page — no chrome */}
      <Route path="/verify/:hash" element={<VerifyPage />} />

      {/* Main app with shell */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"          element={<DashboardPage />} />
        <Route path="/requests/new"       element={<NewRequestPage />} />
        <Route path="/requests/:id"       element={<RequestDetailPage />} />
        <Route path="/review/:reviewId"   element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}
