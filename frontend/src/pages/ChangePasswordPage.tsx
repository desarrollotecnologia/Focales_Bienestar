import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ChangePasswordPage() {
  const { user, refreshUser, logout, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      refreshUser(data.user, data.token);
      setMsg(data.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page min-h-full flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl px-5 sm:px-8 py-8 sm:py-10">
        <div className="text-center mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 mb-3">
            <KeyRound size={22} />
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-primary-900">
            Cambiar contraseña
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            {mustChangePassword
              ? 'Por seguridad debe definir una contraseña personal antes de continuar.'
              : 'Actualice su contraseña de acceso.'}
          </p>
          {user && (
            <p className="text-xs text-stone-400 mt-1">
              Sesión: <span className="font-medium text-stone-600">{user.username}</span>
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {msg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl px-4 py-3">
              {msg}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Field
            label="Contraseña actual"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={show}
          />
          <Field
            label="Nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            show={show}
            hint="Mínimo 8 caracteres · no use Colbeef2026*"
          />
          <Field
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={show}
          />

          <button
            type="button"
            className="text-xs text-stone-500 hover:text-stone-700 inline-flex items-center gap-1"
            onClick={() => setShow((v) => !v)}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
            {show ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full py-2.5 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  show,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <div className="relative mt-1.5">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type={show ? 'text' : 'password'}
          className="w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </label>
  );
}
