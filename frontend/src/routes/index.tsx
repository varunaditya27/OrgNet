import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'

import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES } from './paths'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const DashboardOverviewPage = lazy(
  () => import('@/pages/dashboard/DashboardOverviewPage'),
)
const UsersPage = lazy(() => import('@/pages/dashboard/UsersPage'))
const TeamsPage = lazy(() => import('@/pages/dashboard/TeamsPage'))
const MessagingPage = lazy(() => import('@/pages/dashboard/MessagingPage'))
const FilesPage = lazy(() => import('@/pages/dashboard/FilesPage'))
const AdminPage = lazy(() => import('@/pages/dashboard/AdminPage'))
const AuditLogsPage = lazy(() => import('@/pages/dashboard/AuditLogsPage'))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/system/NotFoundPage'))

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.dashboard.home} replace />} />

      <Route element={<AuthLayout />}>
        <Route path={ROUTES.auth.login} element={<LoginPage />} />
        <Route path={ROUTES.auth.register} element={<RegisterPage />} />
        <Route path={ROUTES.auth.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.auth.resetPassword} element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.dashboard.home} element={<DashboardOverviewPage />} />
          <Route path={ROUTES.dashboard.messaging} element={<MessagingPage />} />
          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route path={ROUTES.dashboard.users} element={<UsersPage />} />
            <Route path={ROUTES.dashboard.teams} element={<TeamsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path={ROUTES.dashboard.files} element={<FilesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path={ROUTES.dashboard.admin} element={<AdminPage />} />
            <Route path={ROUTES.dashboard.auditLogs} element={<AuditLogsPage />} />
          </Route>
          <Route path={ROUTES.dashboard.settings} element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path={ROUTES.notFound} element={<NotFoundPage />} />
    </Routes>
  )
}
