import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EstadoBadge, TermometroBadge } from '@/components/Badges';
import type { Area, Categoria, Ciclo, Hallazgo, Responsable, Termometro, EstadoSeguimiento } from '@/types';

const emptyForm = {
  cicloId: '',
  areaId: '',
  categoriaId: '',
  subcategoriaId: '',
  fecha: '',
  termometro: 'MEDIO' as Termometro,
  observacion: '',
  compromiso: '',
  estadoSeguimiento: 'ABIERTO' as EstadoSeguimiento,
  responsableIds: [] as string[],
};

export default function HallazgosPage() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState<Hallazgo[]>([]);
  const [total, setTotal] = useState(0);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [q, setQ] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ pageSize: '100' });
    if (q) params.set('q', q);
    if (cicloId) params.set('cicloId', cicloId);
    api.get(`/hallazgos?${params}`).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
    });
  };

  useEffect(() => {
    Promise.all([
      api.get('/ciclos'),
      api.get('/catalogos/areas'),
      api.get('/catalogos/categorias'),
      api.get('/catalogos/responsables'),
    ]).then(([c, a, cat, r]) => {
      setCiclos(c.data);
      setAreas(a.data.filter((x: Area) => x.active));
      setCategorias(cat.data);
      setResponsables(r.data);
      const abierto = c.data.find((x: Ciclo) => x.estado === 'ABIERTO');
      if (abierto) {
        setCicloId(abierto.id);
        setForm((f) => ({ ...f, cicloId: abierto.id }));
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [cicloId]);

  const subs = categorias.find((c) => c.id === form.categoriaId)?.subcategorias || [];

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/hallazgos', {
        ...form,
        subcategoriaId: form.subcategoriaId || null,
      });
      setShowForm(false);
      setForm((f) => ({ ...emptyForm, cicloId: f.cicloId }));
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Hallazgos</h2>
          <p className="text-sm text-stone-500">{total} registros (tabla maestra del Excel)</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold"
          >
            <Plus size={16} /> Nuevo hallazgo
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm"
            placeholder="Buscar en observación / avance…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <select
          className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
          value={cicloId}
          onChange={(e) => setCicloId(e.target.value)}
        >
          <option value="">Todos los ciclos</option>
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} ({c.anio})</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium">
          Buscar
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="bg-white border border-stone-200 rounded-2xl p-5 grid md:grid-cols-2 gap-4">
          <Field label="Ciclo">
            <select required className="input" value={form.cicloId} onChange={(e) => setForm({ ...form, cicloId: e.target.value })}>
              <option value="">Seleccione</option>
              {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha">
            <input required type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Field>
          <Field label="Área">
            <select required className="input" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
              <option value="">Seleccione</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Termómetro">
            <select className="input" value={form.termometro} onChange={(e) => setForm({ ...form, termometro: e.target.value as Termometro })}>
              <option value="CRITICO">Crítico (20)</option>
              <option value="MEDIO">Medio (60)</option>
              <option value="POSITIVO">Positivo (100)</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select required className="input" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value, subcategoriaId: '' })}>
              <option value="">Seleccione</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Subcategoría">
            <select className="input" value={form.subcategoriaId} onChange={(e) => setForm({ ...form, subcategoriaId: e.target.value })}>
              <option value="">Opcional</option>
              {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Observación / Hallazgo" className="md:col-span-2">
            <textarea required className="input min-h-24" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          </Field>
          <Field label="Compromiso / Plan de acción" className="md:col-span-2">
            <textarea className="input min-h-20" value={form.compromiso} onChange={(e) => setForm({ ...form, compromiso: e.target.value })} />
          </Field>
          <Field label="Responsables" className="md:col-span-2">
            <select
              multiple
              className="input min-h-28"
              value={form.responsableIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  responsableIds: [...e.target.selectedOptions].map((o) => o.value),
                })
              }
            >
              {responsables.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p className="text-xs text-stone-400 mt-1">Ctrl/Cmd para seleccionar varios</p>
          </Field>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm">Cancelar</button>
            <button disabled={saving} className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold">
              {saving ? 'Guardando…' : 'Guardar hallazgo'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-950 text-white">
            <tr>
              <th className="text-left px-3 py-3">Fecha</th>
              <th className="text-left px-3 py-3">Área</th>
              <th className="text-left px-3 py-3">Categoría</th>
              <th className="text-left px-3 py-3">Termómetro</th>
              <th className="text-left px-3 py-3">Estado</th>
              <th className="text-left px-3 py-3">Hallazgo</th>
              <th className="text-left px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((h) => (
              <tr key={h.id} className="border-b border-stone-100 align-top hover:bg-stone-50">
                <td className="px-3 py-3 whitespace-nowrap">{String(h.fecha).slice(0, 10)}</td>
                <td className="px-3 py-3">{h.area.name}</td>
                <td className="px-3 py-3">
                  <div>{h.categoria.name}</div>
                  <div className="text-xs text-stone-400">{h.subcategoria?.name}</div>
                </td>
                <td className="px-3 py-3"><TermometroBadge value={h.termometro} /></td>
                <td className="px-3 py-3"><EstadoBadge value={h.estadoSeguimiento} /></td>
                <td className="px-3 py-3 max-w-md"><p className="line-clamp-3">{h.observacion}</p></td>
                <td className="px-3 py-3">
                  <Link to={`/hallazgos/${h.id}`} className="text-primary-700 font-medium hover:underline">
                    Abrir
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

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-stone-700 ${className}`}>
      {label}
      <div className="mt-1.5 [&_.input]:w-full [&_.input]:border [&_.input]:border-stone-200 [&_.input]:rounded-xl [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm">
        {children}
      </div>
    </label>
  );
}
