import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import HallazgosPage from '@/pages/HallazgosPage';
import HallazgoDetailPage from '@/pages/HallazgoDetailPage';
import CiclosPage from '@/pages/CiclosPage';
import ResumenMensualPage from '@/pages/ResumenMensualPage';
import CatalogosPage from '@/pages/CatalogosPage';

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
        <Route path="resumen-mensual" element={<ResumenMensualPage />} />
        <Route path="catalogos" element={<CatalogosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
