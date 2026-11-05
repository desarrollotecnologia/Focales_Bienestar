import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

const STANDARD_PASSWORD = 'Colbeef2026*';

interface ManagedUser {
  id: string;
  username: string;
  email?: string | null;
  fullName: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_HELP: Record<UserRole, string> = {
  ADMIN: 'Acceso total + gestión de usuarios',
  EDITOR: 'Crea y edita reuniones, hallazgos y catálogos',
  VIEWER: 'Solo Dashboard: ver y filtrar (sin otras pantallas)',
};

const emptyForm = {
  username: '',
  fullName: '',
  email: '',
  password: STANDARD_PASSWORD,
  role: 'EDITOR' as UserRole,
  active: true,
};

export default function UsuariosPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ManagedUser | null>(null);
  const [confirmReset, setConfirmReset] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const load = () => api.get('/users').then((r) => setItems(r.data));

  useEffect(() => {
    if (!isAdmin) return;
    load().catch(() => setError('No se pudo cargar usuarios'));
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowPassword(false);
    setShowForm(true);
    setError('');
  };

  const openEdit = (u: ManagedUser) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email || '',
      password: '',
      role: u.role,
      active: u.active,
    });
    setShowPassword(false);
    setShowForm(true);
    setError('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/users/${editingId}`, {
          fullName: form.fullName,
          email: form.email || null,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        setMsg('Usuario actualizado');
      } else {
        await api.post('/users', {
          username: form.username,
          fullName: form.fullName,
          email: form.email || null,
          password: form.password,
          role: form.role,
        });
        setMsg('Usuario creado');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
      setTimeout(() => setMsg(''), 2500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      setMsg(`Usuario "${confirmDelete.fullName}" eliminado`);
      setConfirmDelete(null);
      load();
      setTimeout(() => setMsg(''), 2500);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo eliminar');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const doReset = async () => {
    if (!confirmReset) return;
    setResetting(true);
    setError('');
    try {
      const { data } = await api.post(`/users/${confirmReset.id}/reset-password`);
      setMsg(
        data.message ||
          `Contraseña de "${confirmReset.fullName}" restablecida a ${STANDARD_PASSWORD}`,
      );
      setConfirmReset(null);
      load();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo restablecer la contraseña');
      setConfirmReset(null);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Usuarios</h2>
          <p className="text-sm text-stone-500 mt-1">
            Solo administradores. Crear, editar roles y eliminar cuentas de la base de datos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {msg && (
        <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {error && !confirmDelete && (
        <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary-950">
              {editingId ? 'Editar usuario' : 'Crear usuario'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
              <X size={18} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-stone-700">
              Nombre completo
              <input
                required
                className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Usuario (login)
              <input
                required={!editingId}
                disabled={!!editingId}
                className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-stone-50"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ej. juan.perez"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Correo (opcional)
              <input
                type="email"
                className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              {editingId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingId}
                  minLength={6}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 pr-10 text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Rol / permisos</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {(['ADMIN', 'EDITOR', 'VIEWER'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm({ ...form, role })}
                  className={`text-left rounded-xl border px-3 py-3 transition ${
                    form.role === role
                      ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-primary-950">
                    {role === 'ADMIN' ? 'Administrador' : role === 'EDITOR' ? 'Editor' : 'Consulta'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">{ROLE_HELP[role]}</p>
                </button>
              ))}
            </div>
          </div>

          {editingId && (
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Usuario activo (puede iniciar sesión)
            </label>
          )}

          {error && showForm && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm">
              Cancelar
            </button>
            <button
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-950 text-white">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Clave</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-stone-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-primary-950">{u.fullName}</p>
                  {u.email && <p className="text-xs text-stone-400">{u.email}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                      u.role === 'ADMIN'
                        ? 'bg-violet-50 text-violet-800'
                        : u.role === 'EDITOR'
                          ? 'bg-sky-50 text-sky-800'
                          : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {u.role === 'ADMIN' ? 'Admin' : u.role === 'EDITOR' ? 'Editor' : 'Consulta'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold ${
                      u.active ? 'text-emerald-700' : 'text-stone-400'
                    }`}
                  >
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.mustChangePassword ? (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Debe cambiar
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Personalizada</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setConfirmReset(u);
                      }}
                      className="p-2 rounded-lg text-amber-700 hover:bg-amber-50"
                      title={`Restablecer a ${STANDARD_PASSWORD}`}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="p-2 rounded-lg text-primary-700 hover:bg-primary-50"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={u.id === user?.id}
                      onClick={() => {
                        setError('');
                        setConfirmDelete(u);
                      }}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={u.id === user?.id ? 'No puede eliminarse a sí mismo' : 'Eliminar'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-400">
                  No hay usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-primary-950">¿Restablecer contraseña?</h3>
            <p className="text-sm text-stone-600">
              La clave de <strong>{confirmReset.fullName}</strong> ({confirmReset.username})
              volverá a <strong className="font-mono">{STANDARD_PASSWORD}</strong> y deberá
              cambiarla obligatoriamente al iniciar sesión.
            </p>
            {error && (
              <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmReset(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={doReset}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {resetting ? 'Restableciendo…' : 'Sí, restablecer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-primary-950">¿Eliminar usuario?</h3>
            <p className="text-sm text-stone-600">
              Va a eliminar permanentemente de la base de datos a{' '}
              <strong>{confirmDelete.fullName}</strong> ({confirmDelete.username}).
              Esta acción no se puede deshacer.
            </p>
            {error && (
              <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={doDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
