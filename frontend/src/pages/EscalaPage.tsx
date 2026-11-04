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
      setEstados(
        (r.data.estadosArea || []).map((e: EstadoRow) => ({
          ...e,
          color: (e.color || '').replace('#', ''),
        })),
      );
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
      const r = await api.put('/catalogos/escala', {
        termometro: terms,
        estadosArea: estados,
        recalcularHallazgos: true,
      });
      setTerms(r.data.termometro);
      setEstados(
        (r.data.estadosArea || []).map((x: EstadoRow) => ({
          ...x,
          color: (x.color || '').replace('#', ''),
        })),
      );
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
                          const next = [...estados];
                          next[i] = { ...e, estado: ev.target.value };
                          setEstados(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded border border-stone-200"
                          style={{ backgroundColor: `#${e.color || 'ccc'}` }}
                        />
                        <input
                          disabled={!isAdmin}
                          className="w-24 border rounded-lg px-2 py-1.5 font-mono text-xs disabled:bg-stone-50"
                          value={e.color}
                          onChange={(ev) => {
                            const next = [...estados];
                            next[i] = { ...e, color: ev.target.value.replace('#', '') };
                            setEstados(next);
                          }}
                        />
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
