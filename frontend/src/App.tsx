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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-stone-500">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

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
        <Route path="hallazgos" element={<HallazgosPage />} />
        <Route path="hallazgos/:id" element={<HallazgoDetailPage />} />
        <Route path="ciclos" element={<CiclosPage />} />
        <Route path="reuniones" element={<ReunionesPage />} />
        <Route path="reuniones/:id" element={<ReunionDetailPage />} />
        <Route path="resumen-mensual" element={<ResumenMensualPage />} />
        <Route path="catalogos" element={<CatalogosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="escala" element={<EscalaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
