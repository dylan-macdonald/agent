
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Overview } from './pages/Overview';
import { Chat } from './pages/Chat';
import { Calendar } from './pages/Calendar';
import { Goals } from './pages/Goals';
import { Health } from './pages/Health';
import { Settings } from './pages/Settings';
import { Billing } from './pages/Billing';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const userId = localStorage.getItem('agent_user_id');
  if (!userId) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="chat" element={<Chat />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="goals" element={<Goals />} />
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<Settings />} />
          <Route path="billing" element={<Billing />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
