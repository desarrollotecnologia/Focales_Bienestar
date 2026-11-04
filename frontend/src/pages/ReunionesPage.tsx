import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Area, Ciclo, SesionGrupoFocal } from '@/types';

export default function ReunionesPage() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cicloId, setCicloId] = useState(searchParams.get('cicloId') || '');
  const [sesiones, setSesiones] = useState<SesionGrupoFocal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cicloId: searchParams.get('cicloId') || '', areaId: '', fecha: '', hora: '' });
  const [msg, setMsg] = useState('');

  const load = (id = cicloId) => {
    const q = id ? `?cicloId=${id}` : '';
    api.get(`/sesiones${q}`).then((r) => setSesiones(r.data));
  };

  useEffect(() => {
    Promise.all([api.get('/ciclos'), api.get('/catalogos/areas')]).then(([c, a]) => {
      setCiclos(c.data);
      setAreas(a.data.filter((x: Area) => x.active));
      if (!cicloId) {
        const abierto = c.data.find((x: Ciclo) => x.estado === 'ABIERTO');
        const id = abierto?.id || c.data[0]?.id || '';
        setCicloId(id);
        setForm((f) => ({ ...f, cicloId: id }));
      }
    });
  }, []);

  useEffect(() => {
    if (cicloId !== undefined) load(cicloId);
  }, [cicloId]);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api.post(`/ciclos/${form.cicloId}/sesiones`, {
        areaId: form.areaId,
        fecha: form.fecha,
        hora: form.hora || null,
      });
      navigate(`/reuniones/${r.data.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setMsg(error.response?.data?.error || 'No se pudo crear la reunión');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Reuniones</h2>
          <p className="text-sm text-stone-500 mt-1">
            Registro por fecha y área: aquí se anotan los hallazgos de cada grupo focal.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold"
          >
            <Plus size={16} /> Nueva reunión
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
          value={cicloId}
          onChange={(e) => setCicloId(e.target.value)}
        >
          <option value="">Todos los ciclos</option>
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.anio}) — {c.estado}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={crear} className="bg-white border border-stone-200 rounded-2xl p-5 grid md:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-stone-700">
            Ciclo
            <select
              required
              className="mt-1.5 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
              value={form.cicloId}
              onChange={(e) => setForm({ ...form, cicloId: e.target.value })}
            >
              <option value="">Seleccione</option>
              {ciclos.filter((c) => c.estado === 'ABIERTO').map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-700">
            Área
            <select
              required
              className="mt-1.5 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
              value={form.areaId}
              onChange={(e) => setForm({ ...form, areaId: e.target.value })}
            >
              <option value="">Seleccione</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-700">
            Fecha de la reunión
            <input
              required
              type="date"
              className="mt-1.5 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Hora (opcional)
            <input
              type="time"
              className="mt-1.5 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
            />
          </label>
          {msg && (
            <p className="md:col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {msg}
            </p>
          )}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm">
              Cancelar
            </button>
            <button className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold">
              Crear y abrir registro
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-950 text-white">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Área</th>
              <th className="text-left px-4 py-3">Ciclo</th>
              <th className="text-left px-4 py-3">Hora</th>
              <th className="text-left px-4 py-3">Hallazgos</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sesiones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-400">
                  No hay reuniones en este filtro. Cree una para empezar a registrar hallazgos.
                </td>
              </tr>
            )}
            {sesiones.map((s) => (
              <tr key={s.id} className="border-b border-stone-100 ui-row">
                <td className="px-4 py-3 whitespace-nowrap font-medium text-primary-950">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={14} className="text-primary-700" />
                    {String(s.fecha).slice(0, 10)}
                  </span>
                </td>
                <td className="px-4 py-3">{s.area.name}</td>
                <td className="px-4 py-3">{s.ciclo.nombre}</td>
                <td className="px-4 py-3 text-stone-500">{s.hora || '—'}</td>
                <td className="px-4 py-3 font-semibold">{s._count?.hallazgos ?? 0}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/reuniones/${s.id}`}
                    className="text-primary-700 font-medium hover:underline"
                  >
                    Abrir reunión
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
