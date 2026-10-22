/* ریشه برنامه: پوسته، داده‌ها، احراز هویت و مسیرها.
   صفحه‌ها به‌صورت lazy بارگذاری می‌شوند تا شروع برنامه سبک و سریع باشد. */

import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NAV_ITEMS } from './config/navigation';
import { setDigitPreference } from './lib/format';
import { AuthProvider, useAuth } from './store/AuthProvider';
import { DataProvider, useDb } from './store/DataProvider';
import { ThemeProvider } from './store/ThemeProvider';
import { ToastProvider } from './store/ToastProvider';
import { RequireAuth, RequirePermission, RequireSuperadmin, NoAccess } from './components/guards';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSkeleton } from './components/ui/EmptyState';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientsList = lazy(() => import('./pages/ClientsList'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const ClientCreate = lazy(() => import('./pages/ClientCreate'));
const DocumentsList = lazy(() => import('./pages/DocumentsList'));
const DocumentCreate = lazy(() => import('./pages/DocumentCreate'));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'));
const TemplatesList = lazy(() => import('./pages/TemplatesList'));
const TemplateEditor = lazy(() => import('./pages/TemplateEditor'));
const CollectionsList = lazy(() => import('./pages/CollectionsList'));
const UsersList = lazy(() => import('./pages/UsersList'));
const UserEditor = lazy(() => import('./pages/UserEditor'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

/** مسیر خانه: داشبورد اگر مجاز باشد، وگرنه نخستین بخش در دسترس */
function HomeRedirect() {
  const { can } = useAuth();
  if (can('dashboard.view')) return <Dashboard />;
  const firstAvailable = NAV_ITEMS.find((item) => can(item.permission));
  if (firstAvailable) return <Navigate to={firstAvailable.to} replace />;
  return <NoAccess />;
}

function AppRoutes() {
  const { settings } = useDb();
  // ارقام فارسی/لاتین یک بار در هر رندر تنظیم می‌شود (تنظیمات → نمایش)
  setDigitPreference(settings.showPersianDigits);

  return (
    <Suspense
      fallback={
        <div className="p-4 lg:p-6">
          <PageSkeleton />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="admin-users"
            element={
              <RequireSuperadmin>
                <AdminUsersPage />
              </RequireSuperadmin>
            }
          />

          <Route
            path="clients"
            element={
              <RequirePermission permission="clients.view">
                <ClientsList />
              </RequirePermission>
            }
          />
          <Route
            path="clients/new"
            element={
              <RequirePermission permission="clients.create">
                <ClientCreate />
              </RequirePermission>
            }
          />
          <Route
            path="clients/:id"
            element={
              <RequirePermission permission="clients.view">
                <ClientDetail />
              </RequirePermission>
            }
          />

          <Route
            path="documents"
            element={
              <RequirePermission permission="documents.view">
                <DocumentsList />
              </RequirePermission>
            }
          />
          <Route
            path="documents/new"
            element={
              <RequirePermission permission="documents.create">
                <DocumentCreate />
              </RequirePermission>
            }
          />
          <Route
            path="documents/:id"
            element={
              <RequirePermission permission="documents.view">
                <DocumentDetail />
              </RequirePermission>
            }
          />

          <Route
            path="templates"
            element={
              <RequirePermission permission="templates.view">
                <TemplatesList />
              </RequirePermission>
            }
          />
          <Route
            path="templates/new"
            element={
              <RequirePermission permission="templates.create">
                <TemplateEditor />
              </RequirePermission>
            }
          />
          <Route
            path="templates/:id"
            element={
              <RequirePermission permission="templates.view">
                <TemplateEditor />
              </RequirePermission>
            }
          />

          <Route
            path="collections"
            element={
              <RequirePermission permission="companies.view">
                <CollectionsList />
              </RequirePermission>
            }
          />

          <Route
            path="users"
            element={
              <RequirePermission permission="users.view">
                <UsersList />
              </RequirePermission>
            }
          />
          <Route
            path="users/new"
            element={
              <RequirePermission permission="users.create">
                <UserEditor />
              </RequirePermission>
            }
          />
          <Route
            path="users/:id"
            element={
              <RequirePermission permission="users.edit">
                <UserEditor />
              </RequirePermission>
            }
          />

          <Route
            path="roles"
            element={
              <RequirePermission permission="roles.view">
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission permission="reports.view">
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission permission="audit.view">
                <AuditPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings.view">
                <SettingsPage />
              </RequirePermission>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <DataProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
