import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EstadoBadge, TermometroBadge } from '@/components/Badges';
import type {
  Area,
  Categoria,
  Ciclo,
  EstadoSeguimiento,
  Hallazgo,
  Responsable,
  Termometro,
} from '@/types';

interface EditForm {
  cicloId: string;
  areaId: string;
  categoriaId: string;
  subcategoriaId: string;
  fecha: string;
  termometro: Termometro;
  observacion: string;
  compromiso: string;
  estadoSeguimiento: EstadoSeguimiento;
  responsableIds: string[];
}

export default function HallazgoDetailPage() {
  const { id } = useParams();
  const { canEdit } = useAuth();
  const [item, setItem] = useState<Hallazgo | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoSeguimiento>('EN_PROCESO');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get(`/hallazgos/${id}`).then((r) => {
      setItem(r.data);
      setEstado(r.data.estadoSeguimiento);
    });

  useEffect(() => {
    load().catch(() => setError('No se pudo cargar el hallazgo'));
  }, [id]);

  useEffect(() => {
    if (!canEdit) return;
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
    });
  }, [canEdit]);

  const startEdit = () => {
    if (!item) return;
    setForm({
      cicloId: item.cicloId,
      areaId: item.areaId,
      categoriaId: item.categoriaId,
      subcategoriaId: item.subcategoriaId || '',
      fecha: String(item.fecha).slice(0, 10),
      termometro: item.termometro,
      observacion: item.observacion || '',
      compromiso: item.compromiso || '',
      estadoSeguimiento: item.estadoSeguimiento,
      responsableIds: item.responsables.map((r) => r.responsable.id),
    });
    setEditing(true);
    setMsg('');
    setError('');
  };

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !canEdit) return;
    if (!form.observacion.trim()) {
      setError('La observación / hallazgo no puede quedar vacía.');
      return;
    }
    if (
      !window.confirm(
        '¿Confirma guardar los cambios de este hallazgo?\nSe actualizará el registro y la calificación si cambió el termómetro.',
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const { data } = await api.put(`/hallazgos/${id}`, {
        ...form,
        observacion: form.observacion.trim(),
        subcategoriaId: form.subcategoriaId || null,
        compromiso: form.compromiso.trim() || null,
      });
      setItem(data);
      setEstado(data.estadoSeguimiento);
      setEditing(false);
      setForm(null);
      setMsg(
        `Cambios guardados. Termómetro: ${data.termometro} (${data.calificacion} pts) · Estado: ${data.estadoSeguimiento}.`,
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(
        ax.response?.data?.error ||
          'No se pudo guardar el hallazgo. Revise los datos e intente de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const onAvance = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    if (!window.confirm('¿Registrar este avance en el hallazgo?')) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await api.post(`/hallazgos/${id}/avances`, {
        texto: texto.trim(),
        estadoSeguimiento: estado,
      });
      setTexto('');
      await load();
      setMsg('Avance registrado correctamente.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo registrar el avance.');
    } finally {
      setSaving(false);
    }
  };

  if (!item) {
    return <p className="text-stone-500">{error || 'Cargando…'}</p>;
  }

  const subs =
    (form && categorias.find((c) => c.id === form.categoriaId)?.subcategorias) ||
    categorias.find((c) => c.id === item.categoriaId)?.subcategorias ||
    [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/hallazgos" className="text-sm text-primary-700 hover:underline">
          ← Volver a hallazgos
        </Link>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-primary-900 hover:bg-stone-50"
          >
            <Pencil size={15} /> Editar hallazgo
          </button>
        )}
      </div>

      {msg && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {editing && form ? (
        <form
          onSubmit={onSaveEdit}
          className="bg-white border border-stone-200 rounded-2xl p-5 grid md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-primary-900">Editar hallazgo</h3>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(null);
              }}
              className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
            >
              <X size={14} /> Cancelar
            </button>
          </div>

          <Field label="Ciclo">
            <select
              required
              className="input"
              value={form.cicloId}
              onChange={(e) => setForm({ ...form, cicloId: e.target.value })}
            >
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.anio})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input
              required
              type="date"
              className="input"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </Field>
          <Field label="Área">
            <select
              required
              className="input"
              value={form.areaId}
              onChange={(e) => setForm({ ...form, areaId: e.target.value })}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Termómetro">
            <select
              className="input"
              value={form.termometro}
              onChange={(e) =>
                setForm({ ...form, termometro: e.target.value as Termometro })
              }
            >
              <option value="CRITICO">Crítico</option>
              <option value="MEDIO">Medio</option>
              <option value="POSITIVO">Positivo</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select
              required
              className="input"
              value={form.categoriaId}
              onChange={(e) =>
                setForm({ ...form, categoriaId: e.target.value, subcategoriaId: '' })
              }
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategoría">
            <select
              className="input"
              value={form.subcategoriaId}
              onChange={(e) => setForm({ ...form, subcategoriaId: e.target.value })}
            >
              <option value="">Opcional</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado de seguimiento">
            <select
              className="input"
              value={form.estadoSeguimiento}
              onChange={(e) =>
                setForm({
                  ...form,
                  estadoSeguimiento: e.target.value as EstadoSeguimiento,
                })
              }
            >
              <option value="ABIERTO">Abierto</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </Field>
          <Field label="Observación / Hallazgo" className="md:col-span-2">
            <textarea
              required
              className="input min-h-24"
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            />
          </Field>
          <Field label="Compromiso / Plan de acción" className="md:col-span-2">
            <textarea
              className="input min-h-20"
              value={form.compromiso}
              onChange={(e) => setForm({ ...form, compromiso: e.target.value })}
            />
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
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-400 mt-1">Ctrl/Cmd para seleccionar varios</p>
          </Field>

          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(null);
              }}
              className="px-4 py-2 rounded-xl border text-sm"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <TermometroBadge value={item.termometro} />
            <EstadoBadge value={item.estadoSeguimiento} />
            <span className="text-sm text-stone-500">{String(item.fecha).slice(0, 10)}</span>
            <span className="text-sm text-stone-500">· {item.calificacion} pts</span>
            <span className="text-sm text-stone-500">· {item.ciclo.nombre}</span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">
            {item.area.name} · {item.categoria.name}
          </h2>
          {item.subcategoria && <p className="text-stone-500">{item.subcategoria.name}</p>}

          <Section title="Observación / Hallazgo">{item.observacion}</Section>
          <Section title="Compromiso / Plan de acción">{item.compromiso || '—'}</Section>
          <Section title="Avances de gestión">{item.avances || 'Sin avances registrados'}</Section>

          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Responsables</h3>
            <p className="text-sm">
              {item.responsables.map((r) => r.responsable.name).join(' · ') || '—'}
            </p>
          </div>
        </div>
      )}

      {canEdit && !editing && (
        <form onSubmit={onAvance} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-primary-900">Registrar avance</h3>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm min-h-24"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Describa la actualización…"
            required
          />
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoSeguimiento)}
            >
              <option value="ABIERTO">Abierto</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="CERRADO">Cerrado</option>
            </select>
            <button
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar avance'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-700 mb-1">{title}</h3>
      <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">{children}</p>
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
      <div className="mt-1.5 [&_.input]:w-full [&_.input]:border [&_.input]:border-stone-200 [&_.input]:rounded-xl [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm [&_.input]:bg-white">
        {children}
      </div>
    </label>
  );
}
