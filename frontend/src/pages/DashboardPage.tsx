import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Flame,
  Gauge,
  Layers3,
  Thermometer,
} from 'lucide-react';
import api from '@/lib/api';
import type { Area, Ciclo, Categoria, DashboardData } from '@/types';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function DashboardPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [cicloId, setCicloId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [termometro, setTermometro] = useState('');
  const [estado, setEstado] = useState('');
  const [anio, setAnio] = useState('2026');
  const [mes, setMes] = useState('9');

  useEffect(() => {
    Promise.all([
      api.get('/ciclos'),
      api.get('/catalogos/areas'),
      api.get('/catalogos/categorias'),
    ]).then(([c, a, cat]) => {
      setCiclos(c.data);
      setAreas(a.data.filter((x: Area) => x.active));
      setCategorias(cat.data);
    });
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (cicloId) p.set('cicloId', cicloId);
    if (areaId) p.set('areaId', areaId);
    if (categoriaId) p.set('categoriaId', categoriaId);
    if (termometro) p.set('termometro', termometro);
    if (estado) p.set('estado', estado);
    if (anio) p.set('anio', anio);
    if (mes) p.set('mes', mes);
    return p.toString();
  }, [cicloId, areaId, categoriaId, termometro, estado, anio, mes]);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/dashboard?${query}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [query]);

  const periodoLabel = useMemo(() => {
    if (anio && mes) return `${MESES[Number(mes) - 1]} ${anio}`;
    if (anio) return `Año ${anio}`;
    return 'Todos los periodos';
  }, [anio, mes]);

  const downloadPptx = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/dashboard/export/pptx?${query}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-focales-${anio || 'all'}-${mes || 'all'}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <section className="dash-hero relative rounded-3xl text-white px-6 py-7 shadow-lg shadow-primary-950/20">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary-200/90 font-semibold">
              Colbeef · Grupos focales
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl mt-2 tracking-tight">
              Resumen general
            </h2>
            <p className="text-primary-100/90 text-sm mt-2 max-w-xl">
              Panorama consolidado de hallazgos, seguimiento y termómetro por área —
              <span className="font-semibold text-white"> {periodoLabel}</span>
            </p>
          </div>
          <button
            onClick={downloadPptx}
            disabled={exporting || loading}
            className="btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-primary-900 text-sm font-semibold hover:bg-primary-50 disabled:opacity-50 shadow-md"
          >
            <Download size={16} />
            {exporting ? 'Generando…' : 'Descargar PowerPoint'}
          </button>
        </div>
      </section>

      <section className="ui-card bg-white/90 backdrop-blur border border-stone-200/80 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-900 mb-3">
          <Filter size={16} className="text-primary-700" /> Filtros de consulta
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Select label="Año" value={anio} onChange={setAnio} options={[['','Todos'],['2026','2026'],['2025','2025']]} />
          <Select
            label="Mes"
            value={mes}
            onChange={setMes}
            options={[['', 'Todos'], ...MESES.map((m, i) => [String(i + 1), m])]}
          />
          <Select
            label="Ciclo"
            value={cicloId}
            onChange={setCicloId}
            options={[['', 'Todos'], ...ciclos.map((c) => [c.id, `${c.nombre} (${c.anio})`])]}
          />
          <Select
            label="Área"
            value={areaId}
            onChange={setAreaId}
            options={[['', 'Todas'], ...areas.map((a) => [a.id, a.name])]}
          />
          <Select
            label="Categoría"
            value={categoriaId}
            onChange={setCategoriaId}
            options={[['', 'Todas'], ...categorias.map((c) => [c.id, c.name])]}
          />
          <Select
            label="Termómetro"
            value={termometro}
            onChange={setTermometro}
            options={[['', 'Todos'], ['CRITICO', 'Crítico'], ['MEDIO', 'Medio'], ['POSITIVO', 'Positivo']]}
          />
          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={[['', 'Todos'], ['ABIERTO', 'Abierto'], ['EN_PROCESO', 'En proceso'], ['CERRADO', 'Cerrado']]}
          />
        </div>
      </section>

      {loading || !data ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center text-stone-500">
          Cargando panorama…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              className="dash-rise"
              title="Total hallazgos"
              value={data.total}
              icon={<Layers3 size={18} />}
              accent="from-primary-800 to-primary-950"
              barColor="bg-primary-600"
              ratio={1}
            />
            <KpiCard
              className="dash-rise dash-rise-2"
              title="Críticos"
              value={data.termometro.CRITICO}
              icon={<Flame size={18} />}
              accent="from-red-600 to-red-800"
              barColor="bg-red-500"
              ratio={data.total ? data.termometro.CRITICO / data.total : 0}
            />
            <KpiCard
              className="dash-rise dash-rise-3"
              title="Medios"
              value={data.termometro.MEDIO}
              icon={<AlertTriangle size={18} />}
              accent="from-amber-500 to-amber-700"
              barColor="bg-amber-500"
              ratio={data.total ? data.termometro.MEDIO / data.total : 0}
            />
            <KpiCard
              className="dash-rise dash-rise-4"
              title="Positivos"
              value={data.termometro.POSITIVO}
              icon={<CheckCircle2 size={18} />}
              accent="from-emerald-600 to-emerald-800"
              barColor="bg-emerald-500"
              ratio={data.total ? data.termometro.POSITIVO / data.total : 0}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <BreakdownCard
              title="Categorías"
              icon={<Layers3 size={16} />}
              rows={data.categorias}
              total={data.total}
              color="bg-primary-600"
            />
            <BreakdownCard
              title="Subcategorías"
              icon={<Filter size={16} />}
              rows={data.subcategorias.slice(0, 12)}
              total={data.total}
              color="bg-teal-600"
            />

            <div className="ui-card bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Gauge size={16} className="text-primary-700" />
                <h3 className="font-semibold text-primary-900">Estado de seguimiento</h3>
              </div>
              <StatusRow label="Abierto" value={data.estados.ABIERTO} total={data.total} color="bg-sky-500" />
              <StatusRow label="En proceso" value={data.estados.EN_PROCESO} total={data.total} color="bg-violet-500" />
              <StatusRow label="Cerrado" value={data.estados.CERRADO} total={data.total} color="bg-stone-500" />
              <div className="flex justify-between text-sm font-semibold border-t border-stone-100 mt-3 pt-3">
                <span>TOTAL</span>
                <span>{data.total}</span>
              </div>

              {data.comparativoPrevio && (
                <div className="mt-4 rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-2">
                    {data.comparativoPrevio.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <CompChip label="Abierto" value={data.comparativoPrevio.abierto} />
                    <CompChip label="En proceso" value={data.comparativoPrevio.enProceso} />
                    <CompChip label="Cerrado" value={data.comparativoPrevio.cerrado} />
                    <CompChip label="Total" value={data.comparativoPrevio.total} strong />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ui-card bg-white border border-stone-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Thermometer size={18} className="text-primary-700" />
                <h3 className="font-semibold text-primary-900 text-lg">Estado termómetro por área</h3>
              </div>
              <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-2 text-sm">
                <span className="text-stone-500">Promedio </span>
                <strong className="text-primary-950 text-lg font-[family-name:var(--font-display)]">
                  {data.promedioGeneral}
                </strong>
                <span className="text-primary-800 ml-2 font-medium">{data.estadoPromedio}</span>
              </div>
            </div>

            <div className="space-y-4">
              {data.termometroAreas.map((a) => (
                <div key={a.areaId} className="ui-row grid grid-cols-[minmax(7rem,10rem)_1fr_auto] gap-3 items-center rounded-lg px-2 py-1.5 -mx-2">
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{a.area}</p>
                    <p className="text-xs text-stone-400">{a.hallazgos} hallazgos</p>
                  </div>
                  <div>
                    <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full dash-bar-fill ${scoreBarColor(a.calificacion)}`}
                        style={{ width: `${Math.min(100, a.calificacion)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right min-w-[9rem]">
                    <p className="font-[family-name:var(--font-display)] text-lg text-primary-950 leading-none">
                      {a.calificacion}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${scoreBadge(a.calificacion)}`}>
                      {a.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="ui-card rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                  <Flame size={16} />
                </span>
                <h3 className="font-semibold text-red-900 text-lg">
                  Hallazgos críticos
                  <span className="ml-2 text-red-700/80 font-normal text-sm">({data.criticos.length})</span>
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {data.criticos.map((c, i) => (
                  <div
                    key={c.id}
                    className="ui-card rounded-xl bg-white/90 border border-red-100 p-3 text-sm shadow-sm"
                  >
                    <p className="font-semibold text-red-900">
                      {i + 1}. {c.area}
                      <span className="text-stone-500 font-normal">
                        {' '}· {c.categoria}
                        {c.subcategoria ? ` / ${c.subcategoria}` : ''}
                      </span>
                    </p>
                    <p className="text-stone-600 mt-1.5 leading-relaxed">{c.observacion}</p>
                  </div>
                ))}
                {!data.criticos.length && (
                  <p className="text-stone-400 text-sm py-6 text-center">Sin críticos en el filtro.</p>
                )}
              </div>
            </div>

            <div className="ui-card rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <AlertTriangle size={16} />
                </span>
                <h3 className="font-semibold text-amber-950 text-lg">Medios agrupados</h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {data.mediosAgrupados.map((g) => (
                  <div key={g.tema} className="ui-card rounded-xl bg-white/90 border border-amber-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-stone-800">{g.tema}</p>
                      <span className="shrink-0 rounded-md bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5">
                        {g.count}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-stone-600">
                      {g.items.slice(0, 3).map((t, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-amber-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | string[])[];
}) {
  return (
    <label className="text-xs font-medium text-stone-600 block">
      {label}
      <select
        className="mt-1 w-full border border-stone-200 rounded-xl px-2.5 py-2.5 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={`${v}-${l}`} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function KpiCard({
  title,
  value,
  icon,
  accent,
  barColor,
  ratio,
  className = '',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  barColor: string;
  ratio: number;
  className?: string;
}) {
  return (
    <div className={`ui-card relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-semibold">{title}</p>
          <p className="font-[family-name:var(--font-display)] text-4xl text-primary-950 mt-1 leading-none">
            {value}
          </p>
        </div>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
          {icon}
        </span>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full dash-bar-fill ${barColor}`}
          style={{ width: `${Math.max(4, Math.round(ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  icon,
  rows,
  total,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { name: string; count: number }[];
  total: number;
  color: string;
}) {
  return (
    <div className="ui-card bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary-700">{icon}</span>
        <h3 className="font-semibold text-primary-900">{title}</h3>
      </div>
      <ul className="space-y-2.5 text-sm max-h-80 overflow-auto pr-1">
        {rows.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.name}>
              <div className="flex justify-between gap-3 mb-1">
                <span className="truncate text-stone-700">{r.name}</span>
                <strong className="tabular-nums text-primary-950">{r.count}</strong>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`h-full rounded-full dash-bar-fill ${color}`}
                  style={{ width: `${Math.max(3, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
        <li className="flex justify-between border-t pt-2.5 mt-1 font-semibold text-primary-950">
          <span>TOTAL</span>
          <span>{total}</span>
        </li>
      </ul>
    </div>
  );
}

function StatusRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold tabular-nums">
          {value} <span className="text-stone-400 font-normal text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full rounded-full dash-bar-fill ${color}`} style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
    </div>
  );
}

function CompChip({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`rounded-lg px-2.5 py-2 ${strong ? 'bg-primary-100 text-primary-950' : 'bg-white border border-stone-100'}`}>
      <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-lg leading-none mt-0.5">{value}</p>
    </div>
  );
}

/** Misma lógica/colores que Escala (Excel): 0–49 / 50–69 / 70–79 / 80–89 / 90–100 */
function scoreBarColor(score: number) {
  if (score < 50) return 'bg-rose-500'; // E11D48 Crítico
  if (score < 70) return 'bg-orange-500'; // EA580C En Riesgo
  if (score < 80) return 'bg-amber-500'; // CA8A04 Aceptable
  if (score < 90) return 'bg-sky-600'; // 0284C7 Bueno
  return 'bg-emerald-500'; // 059669 Excelente
}

function scoreBadge(score: number) {
  if (score < 50) return 'bg-rose-100 text-rose-800';
  if (score < 70) return 'bg-orange-100 text-orange-900';
  if (score < 80) return 'bg-amber-100 text-amber-900';
  if (score < 90) return 'bg-sky-100 text-sky-800';
  return 'bg-emerald-100 text-emerald-800';
}

