import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  RefreshCw,
  CalendarRange,
  Tags,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hallazgos', label: 'Hallazgos', icon: ClipboardList },
  { to: '/ciclos', label: 'Ciclos', icon: RefreshCw },
  { to: '/resumen-mensual', label: 'Resumen mensual', icon: CalendarRange },
  { to: '/catalogos', label: 'Catálogos', icon: Tags },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside className="w-64 shrink-0 bg-primary-950 text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-300">Colbeef</p>
          <h1 className="font-[family-name:var(--font-display)] text-xl mt-1 leading-tight">
            Focales Bienestar
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-primary-100 mb-3">
            <Users size={16} />
            <div>
              <p className="font-medium text-white">{user?.fullName}</p>
              <p className="text-xs opacity-70">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 text-sm text-primary-200 hover:text-white"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
