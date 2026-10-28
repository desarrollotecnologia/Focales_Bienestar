import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Ciclo, DashboardData } from '@/types';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function ResumenMensualPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [meses, setMeses] = useState<{ anio: number; mes: number; label: string; total: number }[]>([]);
  const [cicloId, setCicloId] = useState('');
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(9);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get('/ciclos').then((r) => setCiclos(r.data));
  }, []);

  useEffect(() => {
    const q = cicloId ? `?cicloId=${cicloId}` : '';
    api.get(`/dashboard/meses${q}`).then((r) => setMeses(r.data));
  }, [cicloId]);

  useEffect(() => {
    const p = new URLSearchParams({ anio: String(anio), mes: String(mes) });
    if (cicloId) p.set('cicloId', cicloId);
    api.get(`/dashboard?${p}`).then((r) => setData(r.data));
  }, [anio, mes, cicloId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">
          Resumen mensual
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Equivalente a las hojas RESUM. del Excel — se alimenta solo de la tabla de hallazgos.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="border rounded-xl px-3 py-2 text-sm" value={cicloId} onChange={(e) => setCicloId(e.target.value)}>
          <option value="">Todos los ciclos</option>
          {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="border rounded-xl px-3 py-2 text-sm" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="border rounded-xl px-3 py-2 text-sm" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {meses.map((m) => (
          <button
            key={`${m.anio}-${m.mes}`}
            onClick={() => { setAnio(m.anio); setMes(m.mes); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              anio === m.anio && mes === m.mes
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-stone-700 border-stone-200'
            }`}
          >
            {m.label} ({m.total})
          </button>
        ))}
      </div>

      {!data ? (
        <p className="text-stone-500">Cargando…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title={`Categorías — ${MESES[mes - 1]} ${anio}`}>
            {data.categorias.map((r) => (
              <Row key={r.name} label={r.name} value={r.count} />
            ))}
            <Row label="TOTAL" value={data.total} bold />
          </Panel>
          <Panel title="Subcategorías">
            {data.subcategorias.map((r) => (
              <Row key={r.name} label={r.name} value={r.count} />
            ))}
            <Row label="TOTAL" value={data.total} bold />
          </Panel>
          <Panel title="Hallazgos (termómetro)">
            <Row label="Crítico" value={data.termometro.CRITICO} />
            <Row label="Medio" value={data.termometro.MEDIO} />
            <Row label="Positivo" value={data.termometro.POSITIVO} />
            <Row label="TOTAL" value={data.total} bold />
          </Panel>
          <Panel title="Estado de seguimiento">
            <Row label="Abierto" value={data.estados.ABIERTO} />
            <Row label="En proceso" value={data.estados.EN_PROCESO} />
            <Row label="Cerrado" value={data.estados.CERRADO} />
            <Row label="TOTAL" value={data.total} bold />
            {data.comparativoPrevio && (
              <div className="mt-3 pt-3 border-t text-sm text-stone-600">
                <p className="font-semibold text-primary-900 mb-1">Julio a periodo previo (acumulado)</p>
                <p>Abierto {data.comparativoPrevio.abierto} · En proceso {data.comparativoPrevio.enProceso} · Cerrado {data.comparativoPrevio.cerrado} · Total {data.comparativoPrevio.total}</p>
              </div>
            )}
          </Panel>
          <Panel title="Estado termómetro" className="lg:col-span-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-2">Área</th>
                  <th>Calificación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.termometroAreas.map((a) => (
                  <tr key={a.areaId} className="border-b border-stone-100">
                    <td className="py-2">{a.area}</td>
                    <td>{a.calificacion}</td>
                    <td>{a.estado}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">PROMEDIO</td>
                  <td>{data.promedioGeneral}</td>
                  <td>{data.estadoPromedio}</td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-stone-200 rounded-2xl p-4 ${className}`}>
      <h3 className="font-semibold text-primary-900 mb-3">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold border-t pt-2 mt-2' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
