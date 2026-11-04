import { FormEvent, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Termometro } from '@/types';

interface TermRow {
  termometro: Termometro;
  puntos: number;
  descripcion: string;
}

interface EstadoRow {
  minPts: number;
  maxPts: number;
  estado: string;
  color: string;
}

const TERM_LABEL: Record<Termometro, string> = {
  POSITIVO: 'Positivo',
  MEDIO: 'Medio',
  CRITICO: 'Crítico',
};

const TERM_BG: Record<Termometro, string> = {
  POSITIVO: 'bg-emerald-50 border-emerald-200',
  MEDIO: 'bg-orange-50 border-orange-200',
  CRITICO: 'bg-rose-50 border-rose-200',
};

/** Misma paleta que dashboard / PPTX / seed — no inventar otros hex. */
const ESTADO_COLORES: Record<string, string> = {
  Excelente: '059669',
  Bueno: '0284C7',
  'Aceptable / Estable': 'CA8A04',
  'En Riesgo / Alerta': 'EA580C',
  'Crítico / Vulnerable': 'E11D48',
};

const PALETA_SISTEMA = [
  { hex: '059669', label: 'Verde (Excelente)' },
  { hex: '0284C7', label: 'Azul (Bueno)' },
  { hex: 'CA8A04', label: 'Ámbar (Aceptable)' },
  { hex: 'EA580C', label: 'Naranja (En Riesgo)' },
  { hex: 'E11D48', label: 'Rojo (Crítico)' },
] as const;

function colorDeEstado(estado: string, color?: string | null): string {
  const raw = (color || '').replace('#', '').trim().toUpperCase();
  if (/^[0-9A-F]{6}$/.test(raw)) return raw;
  return ESTADO_COLORES[estado.trim()] || '78716C';
}

function normalizeEstados(rows: EstadoRow[]): EstadoRow[] {
  return (rows || []).map((e) => ({
    ...e,
    color: colorDeEstado(e.estado, e.color),
  }));
}

export default function EscalaPage() {
  const { isAdmin } = useAuth();
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [estados, setEstados] = useState<EstadoRow[]>([]);
  const [formula, setFormula] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get('/catalogos/escala').then((r) => {
      setTerms(
        r.data.termometro.map((t: TermRow) => ({
          ...t,
          descripcion: t.descripcion || '',
        })),
      );
      setEstados(normalizeEstados(r.data.estadosArea || []));
      setFormula(r.data.formulaArea || '');
    });

  useEffect(() => {
    load().catch(() => setError('No se pudo cargar la escala'));
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const estadosConColor = normalizeEstados(estados);
      const r = await api.put('/catalogos/escala', {
        termometro: terms,
        estadosArea: estadosConColor,
        recalcularHallazgos: true,
      });
      setTerms(r.data.termometro);
      setEstados(normalizeEstados(r.data.estadosArea || []));
      setMsg(
        `Escala guardada. Se recalcularon ${r.data.recalculados ?? 0} hallazgos con los nuevos puntos.`,
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const addEstado = () => {
    setEstados((prev) => [
      ...prev,
      { minPts: 0, maxPts: 0, estado: 'Nuevo estado', color: '78716C' },
    ]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">
          Escala de calificación
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Misma lógica del Excel. El promedio del área = {formula || 'suma de puntos / cantidad de hallazgos'}.
          {isAdmin ? ' Puede editar y guardar; al cambiar puntos se actualizan los hallazgos.' : ' Solo lectura.'}
        </p>
      </div>

      {msg && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{msg}</p>
      )}
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
      )}

      <form onSubmit={onSave} className="space-y-5">
        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <h3 className="font-semibold text-primary-950">Termómetro</h3>
            <p className="text-xs text-stone-500">Puntos que recibe cada hallazgo según su nivel</p>
          </div>
          <div className="p-4 space-y-3">
            {terms.map((t, i) => (
              <div key={t.termometro} className={`rounded-xl border p-4 ${TERM_BG[t.termometro]}`}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-primary-950 w-24">{TERM_LABEL[t.termometro]}</span>
                  <label className="text-xs font-medium text-stone-600 flex items-center gap-2">
                    Puntos
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!isAdmin}
                      className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm bg-white disabled:bg-stone-100"
                      value={t.puntos}
                      onChange={(e) => {
                        const next = [...terms];
                        next[i] = { ...t, puntos: Number(e.target.value) };
                        setTerms(next);
                      }}
                    />
                  </label>
                </div>
                <textarea
                  disabled={!isAdmin}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white disabled:bg-stone-100 min-h-16"
                  value={t.descripcion}
                  onChange={(e) => {
                    const next = [...terms];
                    next[i] = { ...t, descripcion: e.target.value };
                    setTerms(next);
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-primary-950">Rango de calificación (estado del área)</h3>
              <p className="text-xs text-stone-500">Sin solapamientos · valores entre 0 y 100</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={addEstado}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-sm font-medium hover:bg-white"
              >
                <Plus size={14} /> Agregar rango
              </button>
            )}
          </div>
          <div className="px-4 py-2.5 border-b border-stone-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-500 mr-1">Paleta del sistema:</span>
            {PALETA_SISTEMA.map((c) => (
              <span
                key={c.hex}
                className="inline-flex items-center gap-1.5 text-[11px] text-stone-600"
                title={c.label}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: `#${c.hex}` }}
                />
                {c.label.split(' ')[0]}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-white">
                <tr>
                  <th className="text-left px-4 py-2.5">Desde</th>
                  <th className="text-left px-4 py-2.5">Hasta</th>
                  <th className="text-left px-4 py-2.5">Estado del área</th>
                  <th className="text-left px-4 py-2.5">Color</th>
                  {isAdmin && <th className="text-left px-4 py-2.5"></th>}
                </tr>
              </thead>
              <tbody>
                {estados.map((e, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!isAdmin}
                        className="w-20 border rounded-lg px-2 py-1.5 disabled:bg-stone-50"
                        value={e.minPts}
                        onChange={(ev) => {
                          const next = [...estados];
                          next[i] = { ...e, minPts: Number(ev.target.value) };
                          setEstados(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!isAdmin}
                        className="w-20 border rounded-lg px-2 py-1.5 disabled:bg-stone-50"
                        value={e.maxPts}
                        onChange={(ev) => {
                          const next = [...estados];
                          next[i] = { ...e, maxPts: Number(ev.target.value) };
                          setEstados(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        disabled={!isAdmin}
                        className="w-full min-w-[160px] border rounded-lg px-2 py-1.5 disabled:bg-stone-50"
                        value={e.estado}
                        onChange={(ev) => {
                          const nombre = ev.target.value;
                          const next = [...estados];
                          next[i] = {
                            ...e,
                            estado: nombre,
                            color: ESTADO_COLORES[nombre.trim()] || e.color,
                          };
                          setEstados(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          {PALETA_SISTEMA.map((c) => {
                            const actual = colorDeEstado(e.estado, e.color);
                            const selected = actual === c.hex;
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                disabled={!isAdmin}
                                title={c.label}
                                onClick={() => {
                                  if (!isAdmin) return;
                                  const next = [...estados];
                                  next[i] = { ...e, color: c.hex };
                                  setEstados(next);
                                }}
                                className={`w-7 h-7 rounded-full border-2 shrink-0 disabled:cursor-default transition-transform ${
                                  selected
                                    ? 'border-primary-950 scale-110 shadow-sm'
                                    : 'border-white ring-1 ring-stone-200 hover:scale-105'
                                }`}
                                style={{ backgroundColor: `#${c.hex}` }}
                              />
                            );
                          })}
                        </div>
                        <span className="font-mono text-[10px] text-stone-500 uppercase">
                          #{colorDeEstado(e.estado, e.color)}
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setEstados(estados.filter((_, j) => j !== i))}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Quitar rango"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isAdmin && (
          <div className="flex justify-end">
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Guardando…' : 'Guardar escala'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
