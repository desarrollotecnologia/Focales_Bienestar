import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EstadoBadge, TermometroBadge } from '@/components/Badges';
import type { EstadoSeguimiento, Hallazgo } from '@/types';

export default function HallazgoDetailPage() {
  const { id } = useParams();
  const { canEdit } = useAuth();
  const [item, setItem] = useState<Hallazgo | null>(null);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoSeguimiento>('EN_PROCESO');
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/hallazgos/${id}`).then((r) => {
    setItem(r.data);
    setEstado(r.data.estadoSeguimiento);
  });

  useEffect(() => {
    load();
  }, [id]);

  const onAvance = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await api.post(`/hallazgos/${id}/avances`, { texto, estadoSeguimiento: estado });
      setTexto('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!item) return <p className="text-stone-500">Cargando…</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link to="/hallazgos" className="text-sm text-primary-700 hover:underline">← Volver a hallazgos</Link>
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <TermometroBadge value={item.termometro} />
          <EstadoBadge value={item.estadoSeguimiento} />
          <span className="text-sm text-stone-500">{String(item.fecha).slice(0, 10)}</span>
          <span className="text-sm text-stone-500">· {item.calificacion} pts</span>
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

      {canEdit && (
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
