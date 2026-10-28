import { useEffect, useMemo, useState } from 'react';
import { Download, Filter } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">
            Dashboard
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Panorama consolidado — se actualiza con los filtros
          </p>
        </div>
        <button
          onClick={downloadPptx}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? 'Generando…' : 'Descargar PowerPoint'}
        </button>
      </div>

      <section className="bg-white border border-stone-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-900 mb-3">
          <Filter size={16} /> Filtros
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
        <p className="text-stone-500">Cargando dashboard…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat title="Total hallazgos" value={data.total} />
            <Stat title="Críticos" value={data.termometro.CRITICO} tone="red" />
            <Stat title="Medios" value={data.termometro.MEDIO} tone="amber" />
            <Stat title="Positivos" value={data.termometro.POSITIVO} tone="green" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <TableCard title="Categorías" rows={data.categorias} total={data.total} />
            <TableCard title="Subcategorías" rows={data.subcategorias.slice(0, 15)} total={data.total} />
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <h3 className="font-semibold text-primary-900 mb-3">Estado de seguimiento</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Abierto</span><strong>{data.estados.ABIERTO}</strong></li>
                <li className="flex justify-between"><span>En proceso</span><strong>{data.estados.EN_PROCESO}</strong></li>
                <li className="flex justify-between"><span>Cerrado</span><strong>{data.estados.CERRADO}</strong></li>
                <li className="flex justify-between border-t pt-2"><span>Total</span><strong>{data.total}</strong></li>
              </ul>
              {data.comparativoPrevio && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <p className="font-semibold text-primary-900 mb-2">{data.comparativoPrevio.label}</p>
                  <p>Abierto: {data.comparativoPrevio.abierto}</p>
                  <p>En proceso: {data.comparativoPrevio.enProceso}</p>
                  <p>Cerrado: {data.comparativoPrevio.cerrado}</p>
                  <p className="font-medium">Total: {data.comparativoPrevio.total}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-900">Estado termómetro por área</h3>
              <p className="text-sm text-stone-500">
                Promedio: <strong>{data.promedioGeneral}</strong> — {data.estadoPromedio}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="py-2">Área</th>
                  <th className="py-2">Calificación</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                {data.termometroAreas.map((a) => (
                  <tr key={a.areaId} className="border-b border-stone-100">
                    <td className="py-2 font-medium">{a.area}</td>
                    <td className="py-2">{a.calificacion}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        a.calificacion < 50 ? 'bg-red-100 text-red-800' :
                        a.calificacion < 70 ? 'bg-amber-100 text-amber-900' :
                        a.calificacion < 85 ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>{a.estado}</span>
                    </td>
                    <td className="py-2">{a.hallazgos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <h3 className="font-semibold text-red-800 mb-3">
                Hallazgos críticos ({data.criticos.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-auto">
                {data.criticos.map((c, i) => (
                  <div key={c.id} className="text-sm border-l-4 border-red-500 pl-3">
                    <p className="font-medium text-stone-800">
                      {i + 1}. {c.area} / {c.categoria}
                      {c.subcategoria ? ` / ${c.subcategoria}` : ''}
                    </p>
                    <p className="text-stone-600 mt-1">{c.observacion}</p>
                  </div>
                ))}
                {!data.criticos.length && <p className="text-stone-400 text-sm">Sin críticos en el filtro.</p>}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <h3 className="font-semibold text-amber-800 mb-3">Medios agrupados</h3>
              <div className="space-y-3 max-h-96 overflow-auto">
                {data.mediosAgrupados.map((g) => (
                  <div key={g.tema} className="text-sm">
                    <p className="font-semibold text-stone-800">
                      {g.tema} <span className="text-amber-700">({g.count})</span>
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-stone-600">
                      {g.items.slice(0, 3).map((t, idx) => (
                        <li key={idx}>{t}</li>
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
        className="mt-1 w-full border border-stone-200 rounded-lg px-2 py-2 text-sm bg-white"
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

function Stat({ title, value, tone }: { title: string; value: number; tone?: string }) {
  const colors =
    tone === 'red' ? 'border-red-200 bg-red-50' :
    tone === 'amber' ? 'border-amber-200 bg-amber-50' :
    tone === 'green' ? 'border-emerald-200 bg-emerald-50' :
    'border-stone-200 bg-white';
  return (
    <div className={`rounded-2xl border p-4 ${colors}`}>
      <p className="text-xs uppercase tracking-wide text-stone-500">{title}</p>
      <p className="text-3xl font-bold text-primary-950 mt-1">{value}</p>
    </div>
  );
}

function TableCard({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { name: string; count: number }[];
  total: number;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4">
      <h3 className="font-semibold text-primary-900 mb-3">{title}</h3>
      <ul className="space-y-1.5 text-sm max-h-72 overflow-auto">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between gap-3">
            <span className="truncate">{r.name}</span>
            <strong>{r.count}</strong>
          </li>
        ))}
        <li className="flex justify-between border-t pt-2 font-semibold">
          <span>TOTAL</span>
          <span>{total}</span>
        </li>
      </ul>
    </div>
  );
}
