import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import AutomationPage from './pages/AutomationPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
