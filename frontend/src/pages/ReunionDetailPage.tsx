import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EstadoBadge, TermometroBadge } from '@/components/Badges';
import type {
  Categoria,
  Responsable,
  SesionGrupoFocal,
  Termometro,
} from '@/types';

const emptyQuick = {
  categoriaId: '',
  subcategoriaId: '',
  termometro: 'MEDIO' as Termometro,
  observacion: '',
  compromiso: '',
  responsableIds: [] as string[],
};

export default function ReunionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useAuth();
  const obsRef = useRef<HTMLInputElement>(null);
  const [sesion, setSesion] = useState<SesionGrupoFocal | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  const [flashError, setFlashError] = useState('');
  const [actaOpen, setActaOpen] = useState(false);
  const [masCampos, setMasCampos] = useState(false);
  const [acta, setActa] = useState('');
  const [form, setForm] = useState(emptyQuick);

  const load = () => {
    if (!id) return;
    api.get(`/sesiones/${id}`).then((r) => {
      setSesion(r.data);
      setActa(r.data.notasActa || '');
    });
  };

  useEffect(() => {
    load();
    Promise.all([
      api.get('/catalogos/categorias'),
      api.get('/catalogos/responsables'),
    ]).then(([cat, resp]) => {
      setCategorias(cat.data);
      setResponsables(resp.data);
    });
  }, [id]);

  const subs = categorias.find((c) => c.id === form.categoriaId)?.subcategorias || [];
  const puedeEditar = canEdit && sesion?.ciclo.estado === 'ABIERTO';

  const guardarActa = async () => {
    if (!id) return;
    setFlashError('');
    try {
      await api.patch(`/sesiones/${id}`, { notasActa: acta || null });
      setFlash('Acta guardada correctamente');
      setTimeout(() => setFlash(''), 2500);
      load();
    } catch {
      setFlashError('No se pudo guardar el acta.');
    }
  };

  const onQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!sesion || !form.categoriaId || !form.observacion.trim()) {
      setFlashError('Complete categoría y observación para registrar el hallazgo.');
      return;
    }
    setSaving(true);
    setFlashError('');
    setFlash('');
    try {
      await api.post('/hallazgos', {
        sesionId: sesion.id,
        categoriaId: form.categoriaId,
        subcategoriaId: form.subcategoriaId || null,
        termometro: form.termometro,
        observacion: form.observacion.trim(),
        compromiso: form.compromiso.trim() || null,
        responsableIds: form.responsableIds,
      });
      // Mantiene categoría y termómetro para el siguiente renglón (llenado rápido)
      setForm((f) => ({
        ...emptyQuick,
        categoriaId: f.categoriaId,
        subcategoriaId: f.subcategoriaId,
        termometro: f.termometro,
      }));
      setFlash('Hallazgo registrado correctamente');
      setTimeout(() => setFlash(''), 2500);
      load();
      requestAnimationFrame(() => obsRef.current?.focus());
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setFlashError(ax.response?.data?.error || 'No se pudo registrar el hallazgo.');
    } finally {
      setSaving(false);
    }
  };

  if (!sesion) {
    return <p className="text-stone-500">Cargando reunión…</p>;
  }

  const hallazgos = sesion.hallazgos || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/reuniones" className="inline-flex items-center gap-1.5 text-sm text-primary-700 mb-2 hover:underline">
            <ArrowLeft size={14} /> Volver a reuniones
          </Link>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">
            Reunión · {sesion.area.name}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {String(sesion.fecha).slice(0, 10)}
            {sesion.hora ? ` · ${sesion.hora}` : ''}
            {' · '}
            {sesion.ciclo.nombre}
            {' · '}
            {hallazgos.length} registro(s)
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {flash && (
            <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
              {flash}
            </span>
          )}
          {flashError && (
            <span className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">
              {flashError}
            </span>
          )}
        </div>
      </div>

      {puedeEditar && (
        <form
          onSubmit={onQuickAdd}
          className="bg-white border-2 border-primary-200 rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-primary-950">
              Agregar registro rápido
            </h3>
            <p className="text-xs text-stone-500">
              Mismo orden que el Excel · Enter guarda y deja listo el siguiente
            </p>
          </div>

          {/* Orden Excel: Categoría → Subcategoría → Termómetro → Observación → Compromiso → Responsable */}
          <div className="grid md:grid-cols-2 gap-2">
            <label className="text-xs font-medium text-stone-500 block">
              1. Categoría
              <select
                required
                className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800"
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value, subcategoriaId: '' })}
              >
                <option value="">Seleccione…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-stone-500 block">
              2. Subcategoría
              <select
                className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 disabled:bg-stone-50 disabled:text-stone-400"
                value={form.subcategoriaId}
                disabled={!form.categoriaId}
                onChange={(e) => setForm({ ...form, subcategoriaId: e.target.value })}
              >
                <option value="">
                  {!form.categoriaId
                    ? 'Primero elija categoría…'
                    : subs.length === 0
                      ? 'Sin subcategorías'
                      : 'Seleccione…'}
                </option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-500 mb-1.5">3. Termómetro</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['CRITICO', 'Crítico', 'bg-rose-600 border-rose-700'],
                  ['MEDIO', 'Medio', 'bg-orange-500 border-orange-600'],
                  ['POSITIVO', 'Positivo', 'bg-emerald-600 border-emerald-700'],
                ] as const
              ).map(([value, label, activeCls]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, termometro: value })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    form.termometro === value
                      ? `${activeCls} text-white`
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="text-xs font-medium text-stone-500 block">
            4. Observación / Hallazgo
            <div className="mt-1 flex gap-2">
              <input
                ref={obsRef}
                required
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800"
                placeholder="Lo que se dijo o encontró"
                value={form.observacion}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              />
              <button
                disabled={saving || !form.categoriaId || !form.observacion.trim()}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                <Plus size={16} />
                {saving ? '…' : 'Agregar'}
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setMasCampos((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-primary-800"
          >
            {masCampos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {masCampos ? 'Ocultar 5 y 6' : '5. Compromiso y 6. Responsable (opcionales)'}
          </button>

          {masCampos && (
            <div className="grid md:grid-cols-2 gap-2 pt-1 border-t border-stone-100">
              <label className="text-xs font-medium text-stone-500 block">
                5. Compromiso / plan de acción
                <input
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800"
                  placeholder="Acuerdo o plan (opc.)"
                  value={form.compromiso}
                  onChange={(e) => setForm({ ...form, compromiso: e.target.value })}
                />
              </label>
              <label className="text-xs font-medium text-stone-500 block">
                6. Responsable
                <select
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800"
                  value={form.responsableIds[0] || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      responsableIds: e.target.value ? [e.target.value] : [],
                    })
                  }
                >
                  <option value="">Opcional…</option>
                  {responsables.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </form>
      )}

      <div className="ui-card bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="text-sm font-semibold text-primary-950">
            Registros de esta reunión
          </h3>
          <span className="text-xs text-stone-500">{hallazgos.length} filas</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-primary-950 text-white">
            <tr>
              <th className="text-left px-3 py-2.5 w-10">#</th>
              <th className="text-left px-3 py-2.5">Categoría</th>
              <th className="text-left px-3 py-2.5">Termómetro</th>
              <th className="text-left px-3 py-2.5">Hallazgo</th>
              <th className="text-left px-3 py-2.5">Estado</th>
              <th className="text-left px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {hallazgos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Use el formulario de arriba para ir agregando lo que salga en la reunión.
                </td>
              </tr>
            )}
            {hallazgos.map((h, i) => (
              <tr key={h.id} className="border-b border-stone-100 align-top ui-row">
                <td className="px-3 py-2.5 text-stone-400 font-medium">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div>{h.categoria.name}</div>
                  {h.subcategoria?.name && (
                    <div className="text-xs text-stone-400">{h.subcategoria.name}</div>
                  )}
                </td>
                <td className="px-3 py-2.5"><TermometroBadge value={h.termometro} /></td>
                <td className="px-3 py-2.5 max-w-lg">
                  <p className="line-clamp-2">{h.observacion}</p>
                  {h.compromiso && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-1">Compromiso: {h.compromiso}</p>
                  )}
                </td>
                <td className="px-3 py-2.5"><EstadoBadge value={h.estadoSeguimiento} /></td>
                <td className="px-3 py-2.5">
                  <Link to={`/hallazgos/${h.id}`} className="text-primary-700 font-medium hover:underline text-xs">
                    {puedeEditar ? 'Editar' : 'Detalle'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setActaOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <span>Notas / acta (opcional)</span>
            {actaOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {actaOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3">
              <textarea
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm min-h-20"
                placeholder="Asistentes, temas generales…"
                value={acta}
                onChange={(e) => setActa(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={guardarActa}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-medium hover:bg-stone-50"
                >
                  Guardar acta
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
