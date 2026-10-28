import { FormEvent, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Area, Ciclo } from '@/types';

export default function CiclosPage() {
  const { canEdit } = useAuth();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [detalle, setDetalle] = useState<Ciclo & { sesiones?: unknown[] } | null>(null);
  const [nombre, setNombre] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [sesion, setSesion] = useState({ areaId: '', fecha: '', hora: '' });
  const [msg, setMsg] = useState('');

  const load = () => api.get('/ciclos').then((r) => setCiclos(r.data));

  useEffect(() => {
    load();
    api.get('/catalogos/areas').then((r) => setAreas(r.data.filter((a: Area) => a.active)));
  }, []);

  useEffect(() => {
    if (!selected) return setDetalle(null);
    api.get(`/ciclos/${selected}`).then((r) => setDetalle(r.data));
  }, [selected, ciclos]);

  const crearCiclo = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/ciclos', { nombre, anio });
    setNombre('');
    load();
  };

  const crearSesion = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setMsg('');
    try {
      await api.post(`/ciclos/${selected}/sesiones`, sesion);
      setSesion({ areaId: '', fecha: '', hora: '' });
      load();
      const r = await api.get(`/ciclos/${selected}`);
      setDetalle(r.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setMsg(error.response?.data?.error || 'Error al crear sesión');
    }
  };

  const cerrar = async () => {
    if (!selected) return;
    setMsg('');
    try {
      await api.post(`/ciclos/${selected}/cerrar`);
      load();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; pendientes?: { area: string }[] } } };
      const pendientes = error.response?.data?.pendientes?.map((p) => p.area).join(', ');
      setMsg(`${error.response?.data?.error || 'No se pudo cerrar'}${pendientes ? `: ${pendientes}` : ''}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Ciclos</h2>
        <p className="text-sm text-stone-500 mt-1">
          Un ciclo se cierra cuando todas las áreas activas (incluye áreas nuevas) tienen al menos una reunión.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {canEdit && (
            <form onSubmit={crearCiclo} className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
              <label className="text-sm flex-1">
                Nombre
                <input className="mt-1 w-full border rounded-xl px-3 py-2" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ciclo 3" required />
              </label>
              <label className="text-sm w-28">
                Año
                <input type="number" className="mt-1 w-full border rounded-xl px-3 py-2" value={anio} onChange={(e) => setAnio(Number(e.target.value))} required />
              </label>
              <button className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold">Crear</button>
            </form>
          )}

          <div className="bg-white border border-stone-200 rounded-2xl divide-y">
            {ciclos.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-4 py-3 hover:bg-stone-50 ${selected === c.id ? 'bg-primary-50' : ''}`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary-950">{c.nombre}</p>
                    <p className="text-xs text-stone-500">{c.anio} · {c.estado}</p>
                  </div>
                  {c.progreso && (
                    <p className="text-sm font-medium text-primary-800">
                      {c.progreso.areasCubiertas}/{c.progreso.totalAreas} áreas
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          {!detalle ? (
            <p className="text-stone-400 text-sm">Seleccione un ciclo</p>
          ) : (
            <>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-semibold text-xl text-primary-950">{detalle.nombre}</h3>
                  <p className="text-sm text-stone-500">{detalle.estado}</p>
                </div>
                {canEdit && detalle.estado === 'ABIERTO' && (
                  <button onClick={cerrar} className="px-3 py-2 rounded-xl border border-primary-700 text-primary-800 text-sm font-semibold">
                    Cerrar ciclo
                  </button>
                )}
              </div>

              {msg && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{msg}</p>}

              <div>
                <h4 className="text-sm font-semibold mb-2">Cobertura de áreas</h4>
                <ul className="space-y-1.5 text-sm">
                  {detalle.progreso?.detalle.map((d) => (
                    <li key={d.areaId} className="flex justify-between">
                      <span>{d.area}</span>
                      <span className={d.cubierta ? 'text-emerald-700 font-medium' : 'text-red-700'}>
                        {d.cubierta ? `✓ ${d.sesiones} sesión(es)` : 'Pendiente'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {canEdit && detalle.estado === 'ABIERTO' && (
                <form onSubmit={crearSesion} className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-semibold">Registrar reunión / sesión</h4>
                  <select
                    required
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={sesion.areaId}
                    onChange={(e) => setSesion({ ...sesion, areaId: e.target.value })}
                  >
                    <option value="">Área</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <div className="flex gap-3">
                    <input required type="date" className="flex-1 border rounded-xl px-3 py-2 text-sm" value={sesion.fecha} onChange={(e) => setSesion({ ...sesion, fecha: e.target.value })} />
                    <input type="time" className="w-32 border rounded-xl px-3 py-2 text-sm" value={sesion.hora} onChange={(e) => setSesion({ ...sesion, hora: e.target.value })} />
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold">Guardar sesión</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
