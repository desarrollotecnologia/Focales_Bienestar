import { FormEvent, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Area, Categoria, Responsable } from '@/types';

export default function CatalogosPage() {
  const { canEdit } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [areaName, setAreaName] = useState('');
  const [catName, setCatName] = useState('');
  const [subName, setSubName] = useState('');
  const [subCatId, setSubCatId] = useState('');
  const [respName, setRespName] = useState('');

  const load = () =>
    Promise.all([
      api.get('/catalogos/areas'),
      api.get('/catalogos/categorias'),
      api.get('/catalogos/responsables'),
    ]).then(([a, c, r]) => {
      setAreas(a.data);
      setCategorias(c.data);
      setResponsables(r.data);
    });

  useEffect(() => {
    load();
  }, []);

  const addArea = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/areas', { name: areaName });
    setAreaName('');
    load();
  };

  const addCat = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/categorias', { name: catName });
    setCatName('');
    load();
  };

  const addSub = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/subcategorias', { name: subName, categoriaId: subCatId });
    setSubName('');
    load();
  };

  const addResp = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/responsables', { name: respName });
    setRespName('');
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Catálogos</h2>
        <p className="text-sm text-stone-500 mt-1">
          Áreas nuevas cuentan para cerrar el ciclo activo. Categorías/subcategorías alimentan el formulario de hallazgos.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Áreas (${areas.length})`}>
          {canEdit && (
            <form onSubmit={addArea} className="flex gap-2 mb-3">
              <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Nueva área" value={areaName} onChange={(e) => setAreaName(e.target.value)} required />
              <button className="px-3 py-2 rounded-xl bg-primary-800 text-white text-sm">Agregar</button>
            </form>
          )}
          <ul className="text-sm space-y-1">
            {areas.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>{a.name}</span>
                <span className="text-xs text-stone-400">{a.active ? 'Activa' : 'Inactiva'}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Responsables (${responsables.length})`}>
          {canEdit && (
            <form onSubmit={addResp} className="flex gap-2 mb-3">
              <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Nuevo responsable" value={respName} onChange={(e) => setRespName(e.target.value)} required />
              <button className="px-3 py-2 rounded-xl bg-primary-800 text-white text-sm">Agregar</button>
            </form>
          )}
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {responsables.map((r) => <li key={r.id}>{r.name}</li>)}
          </ul>
        </Card>

        <Card title="Categorías" className="lg:col-span-2">
          {canEdit && (
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <form onSubmit={addCat} className="flex gap-2">
                <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Nueva categoría" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                <button className="px-3 py-2 rounded-xl bg-primary-800 text-white text-sm">Agregar</button>
              </form>
              <form onSubmit={addSub} className="flex gap-2">
                <select className="border rounded-xl px-2 py-2 text-sm" value={subCatId} onChange={(e) => setSubCatId(e.target.value)} required>
                  <option value="">Categoría…</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Subcategoría" value={subName} onChange={(e) => setSubName(e.target.value)} required />
                <button className="px-3 py-2 rounded-xl bg-primary-800 text-white text-sm">Agregar</button>
              </form>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {categorias.map((c) => (
              <div key={c.id}>
                <p className="font-semibold text-primary-900">{c.name}</p>
                <ul className="mt-1 text-stone-600 list-disc pl-5">
                  {c.subcategorias.map((s) => <li key={s.id}>{s.name}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
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
      {children}
    </div>
  );
}
