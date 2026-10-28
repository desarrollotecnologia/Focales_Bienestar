import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center px-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl px-8 py-10">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.25em] uppercase text-primary-700 font-semibold">Colbeef</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary-900 mt-2">
            Focales Bienestar
          </h1>
          <p className="text-sm text-stone-500 mt-2">Seguimiento de grupos focales</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <label className="block text-sm font-medium text-stone-700">
            Usuario
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                className="w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Contraseña
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type={show ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-b from-primary-700 to-primary-800 hover:from-primary-600 hover:to-primary-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="text-xs text-center text-stone-400 pt-2">
            Acceso Coordinación Gestión Humana
          </p>
        </form>
      </div>
    </div>
  );
}
