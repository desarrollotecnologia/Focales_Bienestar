import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  RefreshCw,
  CalendarRange,
  CalendarDays,
  Tags,
  LogOut,
  Users,
  Shield,
  Gauge,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Consulta',
};

const allLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reuniones', label: 'Reuniones', icon: CalendarDays },
  { to: '/hallazgos', label: 'Hallazgos', icon: ClipboardList },
  { to: '/ciclos', label: 'Ciclos', icon: RefreshCw },
  { to: '/resumen-mensual', label: 'Resumen mensual', icon: CalendarRange },
  { to: '/catalogos', label: 'Catálogos', icon: Tags },
  { to: '/escala', label: 'Escala', icon: Gauge },
];

export default function Layout() {
  const { user, logout, isAdmin, isViewer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = isViewer
    ? allLinks.filter((l) => l.to === '/')
    : isAdmin
      ? [...allLinks, { to: '/usuarios', label: 'Usuarios', icon: Shield }]
      : allLinks;

  // Cerrar drawer al cambiar de ruta (móvil)
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Bloquear scroll del body con menú abierto
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="px-5 py-5 sm:py-6 border-b border-white/10">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-300">Colbeef</p>
        <h1 className="font-[family-name:var(--font-display)] text-xl mt-1 leading-tight">
          Focales Bienestar
        </h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-white/10'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-primary-100 mb-3 min-w-0">
          <Users size={16} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-xs opacity-70">{user ? ROLE_LABEL[user.role] : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
            navigate('/login');
          }}
          className="flex items-center gap-2 text-sm text-primary-200 hover:text-white"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="h-[100dvh] h-screen flex bg-stone-50 overflow-hidden">
      {/* Sidebar escritorio */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 bg-primary-950 text-white flex-col h-full">
        <Sidebar />
      </aside>

      {/* Overlay + drawer móvil/tablet */}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/50 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] bg-primary-950 text-white flex flex-col transform transition-transform duration-200 ease-out lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-primary-100">Menú</span>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-white/10 text-white"
            aria-label="Cerrar"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar móvil */}
        <header className="lg:hidden shrink-0 z-30 flex items-center gap-3 px-3 sm:px-4 py-3 bg-primary-950 text-white shadow-md">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary-300 leading-none">Colbeef</p>
            <p className="font-[family-name:var(--font-display)] text-base truncate leading-tight mt-0.5">
              Focales Bienestar
            </p>
          </div>
        </header>

        {/* Único contenedor con scroll (rueda del ratón) */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-3 sm:px-5 md:px-6 xl:px-8 2xl:px-10 py-4 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
