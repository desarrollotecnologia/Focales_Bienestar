import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import HallazgosPage from '@/pages/HallazgosPage';
import HallazgoDetailPage from '@/pages/HallazgoDetailPage';
import CiclosPage from '@/pages/CiclosPage';
import ReunionesPage from '@/pages/ReunionesPage';
import ReunionDetailPage from '@/pages/ReunionDetailPage';
import ResumenMensualPage from '@/pages/ResumenMensualPage';
import CatalogosPage from '@/pages/CatalogosPage';
import UsuariosPage from '@/pages/UsuariosPage';
import EscalaPage from '@/pages/EscalaPage';
import type { UserRole } from '@/types';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-stone-500">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Bloquea rutas: Consulta (VIEWER) solo Dashboard. */
function RoleRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const STAFF: UserRole[] = ['ADMIN', 'EDITOR'];
const ADMIN_ONLY: UserRole[] = ['ADMIN'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="hallazgos"
          element={
            <RoleRoute roles={STAFF}>
              <HallazgosPage />
            </RoleRoute>
          }
        />
        <Route
          path="hallazgos/:id"
          element={
            <RoleRoute roles={STAFF}>
              <HallazgoDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="ciclos"
          element={
            <RoleRoute roles={STAFF}>
              <CiclosPage />
            </RoleRoute>
          }
        />
        <Route
          path="reuniones"
          element={
            <RoleRoute roles={STAFF}>
              <ReunionesPage />
            </RoleRoute>
          }
        />
        <Route
          path="reuniones/:id"
          element={
            <RoleRoute roles={STAFF}>
              <ReunionDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="resumen-mensual"
          element={
            <RoleRoute roles={STAFF}>
              <ResumenMensualPage />
            </RoleRoute>
          }
        />
        <Route
          path="catalogos"
          element={
            <RoleRoute roles={STAFF}>
              <CatalogosPage />
            </RoleRoute>
          }
        />
        <Route
          path="escala"
          element={
            <RoleRoute roles={STAFF}>
              <EscalaPage />
            </RoleRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <RoleRoute roles={ADMIN_ONLY}>
              <UsuariosPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
