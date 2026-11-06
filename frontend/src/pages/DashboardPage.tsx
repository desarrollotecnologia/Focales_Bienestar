import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Filter,
  Flame,
  Gauge,
  Layers3,
  LineChart,
  Thermometer,
} from 'lucide-react';
import api from '@/lib/api';
import type { Area, Ciclo, Categoria, DashboardData, TendenciaData, TendenciaDir } from '@/types';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SERIES_COLORS = [
  '#14532d', // general (línea)
  '#0284c7',
  '#ea580c',
  '#7c3aed',
  '#059669',
  '#be123c',
  '#ca8a04',
];

/** Barras estilo referencia (colores vivos por periodo) */
const BAR_COLORS = [
  '#5dade2',
  '#1abc9c',
  '#e74c3c',
  '#f1c40f',
  '#e67e22',
  '#9b59b6',
  '#a8e063',
  '#3498db',
  '#e91e63',
  '#00bcd4',
  '#ff9800',
  '#8bc34a',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [cicloIds, setCicloIds] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [termometros, setTermometros] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [anios, setAnios] = useState<string[]>(['2026']);
  const [meses, setMeses] = useState<string[]>([]);

  // Histórico (local preview)
  const [histAnios, setHistAnios] = useState<string[]>(['2026']);
  const [histAreaIds, setHistAreaIds] = useState<string[]>([]);
  const [histCicloIds, setHistCicloIds] = useState<string[]>([]);
  const [histGranularidad, setHistGranularidad] = useState<'mes' | 'semana'>('mes');
  const [tendencia, setTendencia] = useState<TendenciaData | null>(null);
  const [histLoading, setHistLoading] = useState(true);

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
    if (cicloIds.length) p.set('cicloIds', cicloIds.join(','));
    if (areaIds.length) p.set('areaIds', areaIds.join(','));
    if (categoriaIds.length) p.set('categoriaIds', categoriaIds.join(','));
    if (termometros.length) p.set('termometros', termometros.join(','));
    if (estados.length) p.set('estados', estados.join(','));
    if (anios.length) p.set('anios', anios.join(','));
    if (meses.length) p.set('meses', meses.join(','));
    return p.toString();
  }, [cicloIds, areaIds, categoriaIds, termometros, estados, anios, meses]);

  const histQuery = useMemo(() => {
    const p = new URLSearchParams();
    const years = histAnios.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (years.length) {
      p.set('anioDesde', String(years[0]));
      p.set('anioHasta', String(years[years.length - 1]));
    }
    if (histAreaIds.length) p.set('areaIds', histAreaIds.join(','));
    if (histCicloIds.length) p.set('cicloIds', histCicloIds.join(','));
    p.set('granularidad', histGranularidad);
    return p.toString();
  }, [histAnios, histAreaIds, histCicloIds, histGranularidad]);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/dashboard?${query}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    setHistLoading(true);
    api
      .get(`/dashboard/tendencia?${histQuery}`)
      .then((r) => setTendencia(r.data))
      .catch(() => setTendencia(null))
      .finally(() => setHistLoading(false));
  }, [histQuery]);

  const periodoLabel = useMemo(() => {
    const mesNames = meses.map((m) => MESES[Number(m) - 1]).filter(Boolean);
    if (anios.length && meses.length === 1 && anios.length === 1) {
      return `${mesNames[0]} ${anios[0]}`;
    }
    if (anios.length && mesNames.length) {
      return `${mesNames.join(', ')} · ${anios.join(', ')}`;
    }
    if (anios.length) return `Año${anios.length > 1 ? 's' : ''} ${anios.join(', ')}`;
    if (mesNames.length) return mesNames.join(', ');
    return 'Todos los periodos';
  }, [anios, meses]);

  const abrirArea = (areaId: string) => {
    const p = new URLSearchParams();
    p.set('origen', 'area');
    p.set('areaId', areaId);
    if (anios.length) p.set('anios', anios.join(','));
    if (meses.length) p.set('meses', meses.join(','));
    if (cicloIds.length) p.set('cicloIds', cicloIds.join(','));
    if (categoriaIds.length) p.set('categoriaIds', categoriaIds.join(','));
    if (termometros.length) p.set('termometros', termometros.join(','));
    if (estados.length) p.set('estados', estados.join(','));
    navigate(`/hallazgos?${p.toString()}`);
  };

  const abrirBarra = (periodoKey: string, areaId?: string) => {
    const p = new URLSearchParams();
    p.set('periodo', periodoKey);
    if (areaId) p.set('areaId', areaId);
    else if (histAreaIds.length) p.set('areaIds', histAreaIds.join(','));
    if (histCicloIds.length) p.set('cicloIds', histCicloIds.join(','));
    navigate(`/hallazgos?${p.toString()}`);
  };

  const downloadPptx = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/dashboard/export/pptx?${query}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-focales-${anios.join('-') || 'all'}-${meses.join('-') || 'all'}.pptx`;
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

      <section className="ui-card relative z-40 overflow-visible bg-white/90 backdrop-blur border border-stone-200/80 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-900 mb-3">
          <Filter size={16} className="text-primary-700" /> Filtros de consulta
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
          <MultiSelect
            label="Año"
            values={anios}
            onChange={setAnios}
            options={[{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }]}
            emptyLabel="Todos"
          />
          <MultiSelect
            label="Mes"
            values={meses}
            onChange={setMeses}
            options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
            emptyLabel="Todos"
          />
          <MultiSelect
            label="Ciclo"
            values={cicloIds}
            onChange={setCicloIds}
            options={ciclos.map((c) => ({ value: c.id, label: `${c.nombre} (${c.anio})` }))}
            emptyLabel="Todos"
          />
          <MultiSelect
            label="Área / Gerencia"
            values={areaIds}
            onChange={setAreaIds}
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            emptyLabel="Todas"
          />
          <MultiSelect
            label="Categoría"
            values={categoriaIds}
            onChange={setCategoriaIds}
            options={categorias.map((c) => ({ value: c.id, label: c.name }))}
            emptyLabel="Todas"
          />
          <MultiSelect
            label="Termómetro"
            values={termometros}
            onChange={setTermometros}
            options={[
              { value: 'CRITICO', label: 'Crítico' },
              { value: 'MEDIO', label: 'Medio' },
              { value: 'POSITIVO', label: 'Positivo' },
            ]}
            emptyLabel="Todos"
          />
          <MultiSelect
            label="Estado"
            values={estados}
            onChange={setEstados}
            options={[
              { value: 'ABIERTO', label: 'Abierto' },
              { value: 'EN_PROCESO', label: 'En proceso' },
              { value: 'CERRADO', label: 'Cerrado' },
            ]}
            emptyLabel="Todos"
          />
        </div>
      </section>

      {loading || !data ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center text-stone-500">
          Cargando panorama…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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

          <div className="grid lg:grid-cols-3 gap-4">
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
                <h3 className="font-semibold text-amber-950 text-lg">
                  Medios agrupados
                  <span className="ml-2 text-amber-800/80 font-normal text-sm">
                    ({data.mediosAgrupados.reduce((n, g) => n + g.count, 0)})
                  </span>
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {data.mediosAgrupados.map((g, i) => (
                  <div key={g.tema} className="ui-card rounded-xl bg-white/90 border border-amber-100 p-3 text-sm">
                    <p className="font-semibold text-amber-950">
                      {i + 1}. {g.tema}
                      <span className="ml-2 text-amber-800/70 font-normal text-sm">({g.count})</span>
                    </p>
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
                {!data.mediosAgrupados.length && (
                  <p className="text-stone-400 text-sm py-6 text-center">Sin medios en el filtro.</p>
                )}
              </div>
            </div>

            <div className="ui-card rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <CheckCircle2 size={16} />
                </span>
                <h3 className="font-semibold text-emerald-900 text-lg">
                  Hallazgos positivos
                  <span className="ml-2 text-emerald-700/80 font-normal text-sm">
                    ({(data.positivos || []).length})
                  </span>
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {(data.positivos || []).map((p, i) => (
                  <div
                    key={p.id}
                    className="ui-card rounded-xl bg-white/90 border border-emerald-100 p-3 text-sm shadow-sm"
                  >
                    <p className="font-semibold text-emerald-900">
                      {i + 1}. {p.area}
                      <span className="text-stone-500 font-normal">
                        {' '}· {p.categoria}
                        {p.subcategoria ? ` / ${p.subcategoria}` : ''}
                      </span>
                    </p>
                    <p className="text-stone-600 mt-1.5 leading-relaxed">{p.observacion}</p>
                  </div>
                ))}
                {!(data.positivos || []).length && (
                  <p className="text-stone-400 text-sm py-6 text-center">Sin positivos en el filtro.</p>
                )}
              </div>
            </div>
          </div>

          <div className="ui-card bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <Thermometer size={18} className="text-primary-700 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-primary-900 text-base sm:text-lg truncate">
                    Estado termómetro por área
                  </h3>
                  <p className="text-[11px] text-stone-400">Clic en un área para ver sus hallazgos</p>
                </div>
              </div>
              <div className="rounded-xl bg-primary-50 border border-primary-100 px-3 sm:px-4 py-2 text-sm">
                <span className="text-stone-500">Promedio </span>
                <strong className="text-primary-950 text-lg font-[family-name:var(--font-display)]">
                  {data.promedioGeneral}
                </strong>
                <span className="text-primary-800 ml-2 font-medium text-xs sm:text-sm">{data.estadoPromedio}</span>
              </div>
            </div>

            <div className="space-y-4">
              {data.termometroAreas.map((a) => {
                const sinDatos = a.hallazgos === 0;
                return (
                  <div
                    key={a.areaId}
                    role={sinDatos ? undefined : 'button'}
                    tabIndex={sinDatos ? undefined : 0}
                    onClick={() => {
                      if (!sinDatos) abrirArea(a.areaId);
                    }}
                    onKeyDown={(e) => {
                      if (!sinDatos && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        abrirArea(a.areaId);
                      }
                    }}
                    className={`ui-row grid grid-cols-1 sm:grid-cols-[minmax(6rem,9rem)_1fr_auto] gap-2 sm:gap-3 items-stretch sm:items-center rounded-lg px-2 py-2 sm:py-1.5 -mx-2 ${
                      sinDatos ? 'opacity-60' : 'cursor-pointer hover:bg-primary-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 sm:block">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800 text-sm truncate">{a.area}</p>
                        <p className="text-xs text-stone-400">
                          {sinDatos ? 'Sin hallazgos en el filtro' : `${a.hallazgos} hallazgos`}
                        </p>
                      </div>
                      <div className="text-right sm:hidden shrink-0">
                        <p className="font-[family-name:var(--font-display)] text-base text-primary-950 leading-none">
                          {sinDatos ? '—' : a.calificacion}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            sinDatos ? 'bg-stone-100 text-stone-500' : scoreBadge(a.calificacion)
                          }`}
                        >
                          {a.estado}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full dash-bar-fill ${
                            sinDatos ? 'bg-stone-300' : scoreBarColor(a.calificacion)
                          }`}
                          style={{ width: `${sinDatos ? 0 : Math.min(100, a.calificacion)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[7rem] hidden sm:block">
                      <p className="font-[family-name:var(--font-display)] text-lg text-primary-950 leading-none">
                        {sinDatos ? '—' : a.calificacion}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          sinDatos ? 'bg-stone-100 text-stone-500' : scoreBadge(a.calificacion)
                        }`}
                      >
                        {a.estado}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico — preview local */}
          <div className="ui-card relative z-30 overflow-visible bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-2">
                <LineChart size={18} className="text-primary-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary-900 text-lg">Evolución histórica del termómetro</h3>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Eje vertical = puntuación 0–100 · eje horizontal = meses o semanas (no ciclos). El ciclo es un filtro aparte.
                  </p>
                </div>
              </div>
              {tendencia?.evolucion && (
                <TendenciaChip tendencia={tendencia.evolucion.tendencia} delta={tendencia.evolucion.delta} />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <MultiSelect
                label="Años"
                values={histAnios}
                onChange={setHistAnios}
                options={[
                  { value: '2025', label: '2025' },
                  { value: '2026', label: '2026' },
                ]}
                emptyLabel="Todos"
              />
              <MultiSelect
                label="Periodo"
                values={[histGranularidad]}
                onChange={(v) => {
                  const next = v.find((x) => x !== histGranularidad) || v[0] || 'mes';
                  setHistGranularidad(next === 'semana' ? 'semana' : 'mes');
                }}
                options={[
                  { value: 'mes', label: 'Por mes' },
                  { value: 'semana', label: 'Por semana' },
                ]}
                emptyLabel="Por mes"
              />
              <MultiSelect
                label="Área / Gerencia"
                values={histAreaIds}
                onChange={setHistAreaIds}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
                emptyLabel="Todas"
              />
              <MultiSelect
                label="Ciclo"
                values={histCicloIds}
                onChange={setHistCicloIds}
                options={ciclos.map((c) => ({ value: c.id, label: `${c.nombre} (${c.anio})` }))}
                emptyLabel="Todos"
              />
            </div>

            {histLoading ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-12 text-center text-stone-400 text-sm">
                Cargando tendencia…
              </div>
            ) : !tendencia || !tendencia.periodos.length ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-12 text-center text-stone-400 text-sm">
                No hay hallazgos en el rango seleccionado.
              </div>
            ) : (
              <>
                {tendencia.evolucion && (
                  <div className="grid sm:grid-cols-3 gap-3 mb-5">
                    <HistStat
                      label={`Inicio · ${tendencia.evolucion.desde}`}
                      value={tendencia.evolucion.promedioInicial}
                    />
                    <HistStat
                      label={`Actual · ${tendencia.evolucion.hasta}`}
                      value={tendencia.evolucion.promedioActual}
                    />
                    <HistStat
                      label="Cambio neto"
                      value={tendencia.evolucion.delta}
                      signed
                      accent={tendencia.evolucion.tendencia}
                    />
                  </div>
                )}

                <TendenciaChart
                  series={tendencia.series}
                  granularidad={tendencia.filtros.granularidad}
                  onOpen={abrirBarra}
                />

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-stone-500 border-b border-stone-100">
                        <th className="py-2 pr-3 font-semibold">Área</th>
                        <th className="py-2 pr-3 font-semibold text-right">Inicio</th>
                        <th className="py-2 pr-3 font-semibold text-right">Actual</th>
                        <th className="py-2 pr-3 font-semibold text-right">Δ</th>
                        <th className="py-2 font-semibold">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tendencia.areasEvolucion.map((a) => (
                        <tr key={a.areaId} className="border-b border-stone-50 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-stone-800">{a.area}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-stone-600">
                            {a.promedioInicial ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-primary-950">
                            {a.promedioActual ?? '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {a.delta == null ? '—' : (
                              <span className={deltaClass(a.tendencia)}>
                                {a.delta > 0 ? '+' : ''}
                                {a.delta}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <TendenciaLabel tendencia={a.tendencia} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-stone-400 mt-3">
                    {tendencia.totalHallazgos} hallazgos · {tendencia.periodos.length} periodos ·
                    comparación primer vs último periodo con datos
                  </p>
                </div>
              </>
            )}
          </div>

        </>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  values,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const summary =
    values.length === 0
      ? emptyLabel
      : values.length === 1
        ? options.find((o) => o.value === values[0])?.label || '1 seleccionada'
        : `${values.length} seleccionadas`;

  const toggle = (id: string) => {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  };

  return (
    <div className={`text-xs font-medium text-stone-600 relative ${open ? 'z-50' : ''}`}>
      <span className="block">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 w-full border rounded-xl px-2.5 py-2.5 text-sm text-left bg-stone-50 hover:bg-white transition flex items-center justify-between gap-2 ${
          open || values.length ? 'border-primary-600 ring-2 ring-primary-600/15' : 'border-stone-200'
        }`}
      >
        <span className="truncate text-stone-800">{summary}</span>
        <span className="text-stone-400 shrink-0">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-stone-200 bg-white shadow-xl max-h-52 overflow-auto p-1.5">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-stone-100 mb-1">
              <button
                type="button"
                className="text-[11px] text-primary-800 font-semibold hover:underline"
                onClick={() => onChange(options.map((o) => o.value))}
              >
                Marcar todas
              </button>
              <button
                type="button"
                className="text-[11px] text-stone-500 font-semibold hover:underline"
                onClick={() => onChange([])}
              >
                Limpiar (= {emptyLabel.toLowerCase()})
              </button>
            </div>
            {options.map((o) => {
              const checked = values.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm ${
                    checked ? 'bg-primary-50 text-primary-950' : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="rounded border-stone-300 text-primary-700 focus:ring-primary-600"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
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

function deltaClass(t: TendenciaDir) {
  if (t === 'mejoro') return 'text-emerald-700 font-semibold';
  if (t === 'empeoro') return 'text-rose-700 font-semibold';
  return 'text-stone-500 font-medium';
}

function TendenciaChip({ tendencia, delta }: { tendencia: TendenciaDir; delta: number }) {
  const cfg =
    tendencia === 'mejoro'
      ? { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: ArrowUpRight, label: 'Mejoró' }
      : tendencia === 'empeoro'
        ? { bg: 'bg-rose-50 border-rose-200 text-rose-900', Icon: ArrowDownRight, label: 'Empeoró' }
        : { bg: 'bg-stone-50 border-stone-200 text-stone-700', Icon: ArrowRight, label: 'Estable' };
  const Icon = cfg.Icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${cfg.bg}`}>
      <Icon size={16} />
      {cfg.label}
      <span className="tabular-nums opacity-80">
        ({delta > 0 ? '+' : ''}
        {delta} pts)
      </span>
    </div>
  );
}

function TendenciaLabel({ tendencia }: { tendencia: TendenciaDir }) {
  if (tendencia === 'sin_datos') {
    return <span className="text-xs text-stone-400">Sin datos</span>;
  }
  if (tendencia === 'mejoro') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <ArrowUpRight size={14} /> Mejoró
      </span>
    );
  }
  if (tendencia === 'empeoro') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
        <ArrowDownRight size={14} /> Empeoró
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
      <ArrowRight size={14} /> Estable
    </span>
  );
}

function HistStat({
  label,
  value,
  signed,
  accent,
}: {
  label: string;
  value: number;
  signed?: boolean;
  accent?: TendenciaDir;
}) {
  const color =
    accent === 'mejoro'
      ? 'text-emerald-700'
      : accent === 'empeoro'
        ? 'text-rose-700'
        : 'text-primary-950';
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/80 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">{label}</p>
      <p className={`font-[family-name:var(--font-display)] text-2xl mt-1 leading-none ${color}`}>
        {signed && value > 0 ? '+' : ''}
        {value}
      </p>
    </div>
  );
}

function shortPeriodLabel(lab: string) {
  if (lab.startsWith('S')) return lab;
  return lab.replace(/ 20\d{2}/, '').slice(0, 10);
}

const AREA_LINE_COLORS = [
  '#0284c7',
  '#ea580c',
  '#7c3aed',
  '#059669',
  '#be123c',
  '#ca8a04',
  '#0d9488',
  '#db2777',
  '#4f46e5',
];

function TendenciaChart({
  series,
  granularidad,
  onOpen,
}: {
  series: TendenciaData['series'];
  granularidad: 'mes' | 'semana';
  onOpen: (periodoKey: string, areaId?: string) => void;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const general = series.find((s) => s.id === 'general') || series[0];
  const areaSeries = series.filter((s) => s.id !== 'general');
  const labels = general?.puntos.map((p) => p.label) || [];
  const xAxisTitle = granularidad === 'semana' ? 'Semanas' : 'Meses';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <CompactBarsChart general={general} labels={labels} xAxisTitle={xAxisTitle} onOpen={onOpen} />
      <CompactAreasBarsChart
        areaSeries={areaSeries}
        labels={labels}
        xAxisTitle={xAxisTitle}
        focusId={focusId}
        onFocus={setFocusId}
        onOpen={onOpen}
      />
    </div>
  );
}

function AxisYLabel({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <text
      x={x}
      y={y + h / 2}
      textAnchor="middle"
      fontSize={9}
      fill="#78716c"
      fontWeight={600}
      transform={`rotate(-90 ${x} ${y + h / 2})`}
    >
      Puntuación (0–100)
    </text>
  );
}

type ChartTip = { x: number; y: number; lines: string[] };

function ChartTooltip({ tip }: { tip: ChartTip | null }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg bg-stone-900 text-white text-xs px-2.5 py-1.5 shadow-lg max-w-[14rem]"
      style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
    >
      {tip.lines.map((line, i) => (
        <p key={i} className={i === 0 ? 'font-semibold' : 'text-stone-300 mt-0.5'}>
          {line}
        </p>
      ))}
    </div>
  );
}

function CompactBarsChart({
  general,
  labels,
  xAxisTitle,
  onOpen,
}: {
  general: TendenciaData['series'][number] | undefined;
  labels: string[];
  xAxisTitle: string;
  onOpen: (periodoKey: string) => void;
}) {
  const [tip, setTip] = useState<ChartTip | null>(null);

  const count = labels.length;
  const W = 440;
  const H = 220;
  const pad = { t: 16, r: 14, b: 44, l: 48 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const minY = 0;
  const maxY = 100;
  const slot = count > 0 ? innerW / count : innerW;
  const barW = Math.min(48, Math.max(22, slot * 0.55));
  const xCenter = (i: number) => pad.l + slot * i + slot / 2;
  const yAt = (v: number) => pad.t + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;
  const baseline = yAt(0);
  const ticks = [0, 30, 60, 90, 100];

  const lineParts: string[] = [];
  let started = false;
  general?.puntos.forEach((p, i) => {
    if (p.valor == null) {
      started = false;
      return;
    }
    lineParts.push(`${started ? 'L' : 'M'} ${xCenter(i)} ${yAt(p.valor)}`);
    started = true;
  });

  const showTip = (e: ReactMouseEvent, lines: string[]) => {
    const box = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement as HTMLElement | null;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines });
  };

  return (
    <div className="relative rounded-xl border border-stone-200 bg-[#ebe6df] overflow-visible">
      <div className="px-3 pt-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-stone-700">Promedio general</p>
        <p className="text-[10px] text-stone-500">Clic en una barra para ver sus hallazgos</p>
      </div>
      <div className="relative overflow-visible">
        <ChartTooltip tip={tip} />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Promedio general"
          onMouseLeave={() => setTip(null)}
        >
          <AxisYLabel x={11} y={pad.t} h={innerH} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={yAt(t)} y2={yAt(t)} stroke="#fff" strokeWidth={1} opacity={0.85} />
              <text x={pad.l - 6} y={yAt(t) + 3} textAnchor="end" fontSize={9} fill="#78716c">
                {t}
              </text>
            </g>
          ))}
          {general?.puntos.map((p, i) => {
            if (p.valor == null) return null;
            const x = xCenter(i) - barW / 2;
            const y = yAt(p.valor);
            const h = Math.max(4, baseline - y);
            return (
              <g key={p.key}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={8}
                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                  className="cursor-pointer"
                  onMouseMove={(e) =>
                    showTip(e, [
                      `Promedio general · ${p.label}`,
                      `Puntuación: ${p.valor} pts`,
                      `${p.hallazgos} hallazgos`,
                      'Clic para ver el detalle',
                    ])
                  }
                  onMouseLeave={() => setTip(null)}
                  onClick={() => onOpen(p.key)}
                />
                <text
                  x={xCenter(i)}
                  y={h > 22 ? y + h / 2 + 4 : y - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={h > 22 ? '#fff' : '#44403c'}
                  className="pointer-events-none"
                >
                  {Math.round(p.valor)}
                </text>
              </g>
            );
          })}
          <path d={lineParts.join(' ')} fill="none" stroke="#14532d" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="pointer-events-none" />
          {general?.puntos.map((p, i) =>
            p.valor == null ? null : (
              <circle key={i} cx={xCenter(i)} cy={yAt(p.valor)} r={3.5} fill="#14532d" stroke="#fff" strokeWidth={1.5} className="pointer-events-none" />
            ),
          )}
          {labels.map((lab, i) => (
            <text key={lab + i} x={xCenter(i)} y={H - 22} textAnchor="middle" fontSize={9} fill="#57534e">
              {shortPeriodLabel(lab)}
            </text>
          ))}
          <text x={pad.l + innerW / 2} y={H - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill="#57534e">
            {xAxisTitle}
          </text>
        </svg>
      </div>
    </div>
  );
}

function CompactAreasBarsChart({
  areaSeries,
  labels,
  xAxisTitle,
  focusId,
  onFocus,
  onOpen,
}: {
  areaSeries: TendenciaData['series'];
  labels: string[];
  xAxisTitle: string;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  onOpen: (periodoKey: string, areaId?: string) => void;
}) {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const visible = focusId ? areaSeries.filter((s) => s.id === focusId) : areaSeries;
  const count = labels.length;
  const nAreas = Math.max(visible.length, 1);
  const W = 440;
  const H = 220;
  const pad = { t: 16, r: 14, b: 44, l: 48 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const minY = 0;
  const maxY = 100;
  const groupW = count > 0 ? innerW / count : innerW;
  const gap = 2;
  const barW = Math.min(14, Math.max(3, (groupW * 0.85 - gap * (nAreas - 1)) / nAreas));
  const groupPad = (groupW - (barW * nAreas + gap * (nAreas - 1))) / 2;

  const xGroup = (periodIdx: number) => pad.l + groupW * periodIdx;
  const yAt = (v: number) => pad.t + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;
  const baseline = yAt(0);
  const ticks = [0, 30, 60, 90, 100];

  const colorOf = (id: string) => {
    const idx = areaSeries.findIndex((s) => s.id === id);
    return AREA_LINE_COLORS[(idx >= 0 ? idx : 0) % AREA_LINE_COLORS.length];
  };

  const showTip = (e: ReactMouseEvent, lines: string[]) => {
    const box = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement as HTMLElement | null;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-visible">
      <div className="px-3 pt-2 flex flex-wrap items-baseline justify-between gap-1">
        <div>
          <p className="text-xs font-semibold text-stone-700">Puntuación por área</p>
          <p className="text-[10px] text-stone-500">
            Barras = calificación media en cada {xAxisTitle === 'Semanas' ? 'semana' : 'mes'} · clic para ver los hallazgos
          </p>
        </div>
        <p className="text-[10px] text-stone-400">Clic en área para filtrar</p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 pb-1">
        {areaSeries.map((s) => {
          const color = colorOf(s.id);
          const active = !focusId || focusId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onFocus(focusId === s.id ? null : s.id)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                active ? 'bg-stone-100 text-stone-800' : 'text-stone-400 opacity-40'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-sm" style={{ background: color }} />
              {s.nombre}
            </button>
          );
        })}
      </div>
      {!areaSeries.length ? (
        <p className="text-xs text-stone-400 text-center py-10">Sin áreas en el rango</p>
      ) : (
        <div className="relative">
          <ChartTooltip tip={tip} />
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Puntuación por área"
            onMouseLeave={() => setTip(null)}
          >
            <AxisYLabel x={11} y={pad.t} h={innerH} />
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={yAt(t)} y2={yAt(t)} stroke="#f5f5f4" strokeWidth={1} />
                <text x={pad.l - 6} y={yAt(t) + 3} textAnchor="end" fontSize={9} fill="#a8a29e">
                  {t}
                </text>
              </g>
            ))}
            {labels.map((lab, pi) => {
              const gx = xGroup(pi);
              return (
                <g key={lab + pi}>
                  {visible.map((s, ai) => {
                    const p = s.puntos[pi];
                    if (!p || p.valor == null) return null;
                    const x = gx + groupPad + ai * (barW + gap);
                    const y = yAt(p.valor);
                    const h = Math.max(3, baseline - y);
                    const color = colorOf(s.id);
                    const hitW = Math.max(barW, 8);
                    const hitX = x - (hitW - barW) / 2;
                    return (
                      <g key={s.id}>
                        <rect x={x} y={y} width={barW} height={h} rx={3} fill={color} className="pointer-events-none" />
                        {/* zona de hover más ancha para barras finas */}
                        <rect
                          x={hitX}
                          y={Math.min(y, baseline - 4)}
                          width={hitW}
                          height={Math.max(h, 4)}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseMove={(e) =>
                            showTip(e, [
                              s.nombre,
                              `${lab}`,
                              `Puntuación: ${p.valor} pts`,
                              `${p.hallazgos} hallazgos`,
                              'Clic para ver el detalle',
                            ])
                          }
                          onMouseLeave={() => setTip(null)}
                          onClick={() => onOpen(p.key, s.id)}
                        />
                      </g>
                    );
                  })}
                  <text x={gx + groupW / 2} y={H - 22} textAnchor="middle" fontSize={9} fill="#57534e">
                    {shortPeriodLabel(lab)}
                  </text>
                </g>
              );
            })}
            <text x={pad.l + innerW / 2} y={H - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill="#57534e">
              {xAxisTitle}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

