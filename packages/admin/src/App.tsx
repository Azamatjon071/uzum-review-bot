import { Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import SubmissionsPage from '@/pages/SubmissionsPage'
import UsersPage from '@/pages/UsersPage'
import PrizesPage from '@/pages/PrizesPage'
import CharityPage from '@/pages/CharityPage'
import BroadcastPage from '@/pages/BroadcastPage'
import ProductsPage from '@/pages/ProductsPage'
import ReportsPage from '@/pages/ReportsPage'
import AuditPage from '@/pages/AuditPage'
import AdminsPage from '@/pages/AdminsPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="prizes" element={<PrizesPage />} />
        <Route path="charity" element={<CharityPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Catch-all → dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
