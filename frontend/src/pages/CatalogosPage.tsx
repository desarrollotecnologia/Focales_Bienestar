import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, RotateCcw, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Area, Categoria, Responsable, Subcategoria } from '@/types';

type Tab = 'areas' | 'categorias' | 'responsables';

export default function CatalogosPage() {
  const { canEdit } = useAuth();
  const [tab, setTab] = useState<Tab>('areas');
  const [areas, setAreas] = useState<Area[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [areaName, setAreaName] = useState('');
  const [catName, setCatName] = useState('');
  const [subName, setSubName] = useState('');
  const [subCatId, setSubCatId] = useState('');
  const [respName, setRespName] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<{ tipo: string; id: string; name: string } | null>(null);

  const load = () =>
    Promise.all([
      api.get('/catalogos/areas?all=1'),
      api.get('/catalogos/categorias?all=1'),
      api.get('/catalogos/responsables?all=1'),
    ]).then(([a, c, r]) => {
      setAreas(a.data);
      setCategorias(c.data);
      setResponsables(r.data);
      if (!subCatId && c.data[0]) setSubCatId(c.data[0].id);
    });

  useEffect(() => {
    load();
  }, []);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2800);
  };

  const addArea = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/areas', { name: areaName });
    setAreaName('');
    flash('Área agregada');
    load();
  };

  const addCat = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api.post('/catalogos/categorias', { name: catName });
    setCatName('');
    setSubCatId(r.data.id);
    flash('Categoría agregada');
    load();
  };

  const addSub = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/subcategorias', { name: subName, categoriaId: subCatId });
    setSubName('');
    flash('Subcategoría agregada');
    load();
  };

  const addResp = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/catalogos/responsables', { name: respName });
    setRespName('');
    flash('Responsable agregado');
    load();
  };

  const saveEdit = async () => {
    if (!editing?.name.trim()) return;
    const { tipo, id, name } = editing;
    const path =
      tipo === 'area'
        ? `/catalogos/areas/${id}`
        : tipo === 'categoria'
          ? `/catalogos/categorias/${id}`
          : tipo === 'subcategoria'
            ? `/catalogos/subcategorias/${id}`
            : `/catalogos/responsables/${id}`;
    await api.patch(path, { name: name.trim() });
    setEditing(null);
    flash('Nombre actualizado');
    load();
  };

  const removeItem = async (tipo: string, id: string, label: string) => {
    if (!confirm(`¿Eliminar "${label}"?\nSi ya se usó en hallazgos, se desactivará en lugar de borrarse.`)) {
      return;
    }
    const path =
      tipo === 'area'
        ? `/catalogos/areas/${id}`
        : tipo === 'categoria'
          ? `/catalogos/categorias/${id}`
          : tipo === 'subcategoria'
            ? `/catalogos/subcategorias/${id}`
            : `/catalogos/responsables/${id}`;
    const r = await api.delete(path);
    flash(r.data.softDeleted ? r.data.motivo || 'Desactivado' : 'Eliminado');
    load();
  };

  const toggleActive = async (tipo: string, id: string, active: boolean) => {
    const path =
      tipo === 'area'
        ? `/catalogos/areas/${id}`
        : tipo === 'categoria'
          ? `/catalogos/categorias/${id}`
          : tipo === 'subcategoria'
            ? `/catalogos/subcategorias/${id}`
            : `/catalogos/responsables/${id}`;
    await api.patch(path, { active: !active });
    flash(!active ? 'Reactivado' : 'Desactivado');
    load();
  };

  const areasFiltradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(t));
  }, [areas, q]);

  const catsFiltradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return categorias;
    return categorias.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        c.subcategorias.some((s) => s.name.toLowerCase().includes(t)),
    );
  }, [categorias, q]);

  const respsFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return responsables;
    return responsables.filter((r) => r.name.toLowerCase().includes(t));
  }, [responsables, q]);

  const totalSubs = categorias.reduce((n, c) => n + c.subcategorias.length, 0);
  const catSeleccionada = categorias.find((c) => c.id === subCatId);

  const tabs: { id: Tab; label: string; count: number; hint: string }[] = [
    { id: 'areas', label: 'Áreas', count: areas.length, hint: 'Agregar, editar o desactivar áreas del ciclo' },
    { id: 'categorias', label: 'Categorías', count: categorias.length, hint: `${totalSubs} subcategorías` },
    { id: 'responsables', label: 'Responsables', count: responsables.length, hint: 'Asignación en hallazgos' },
  ];

  const RowActions = ({
    tipo,
    id,
    name,
    active,
  }: {
    tipo: string;
    id: string;
    name: string;
    active: boolean;
  }) => {
    if (!canEdit) return null;
    if (editing?.tipo === tipo && editing.id === id) {
      return (
        <div className="flex items-center gap-1">
          <button type="button" onClick={saveEdit} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50" title="Guardar">
            <Check size={15} />
          </button>
          <button type="button" onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100" title="Cancelar">
            <X size={15} />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing({ tipo, id, name })}
          className="p-1.5 rounded-lg text-primary-700 hover:bg-primary-50"
          title="Editar"
        >
          <Pencil size={14} />
        </button>
        {!active ? (
          <button
            type="button"
            onClick={() => toggleActive(tipo, id, active)}
            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"
            title="Reactivar"
          >
            <RotateCcw size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => removeItem(tipo, id, name)}
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
            title="Eliminar / desactivar"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  };

  const NameCell = ({ tipo, id, name, active }: { tipo: string; id: string; name: string; active: boolean }) => {
    if (editing?.tipo === tipo && editing.id === id) {
      return (
        <input
          autoFocus
          className="flex-1 border border-primary-300 rounded-lg px-2 py-1 text-sm"
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') setEditing(null);
          }}
        />
      );
    }
    return (
      <span className={`text-sm font-medium ${active ? 'text-primary-950' : 'text-stone-400 line-through'}`}>
        {name}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-primary-950">Catálogos</h2>
          <p className="text-sm text-stone-500 mt-1">
            Agregar, editar y eliminar. Si un ítem ya se usó, se desactiva para no romper reportes.
          </p>
        </div>
        {msg && (
          <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
            {msg}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setQ('');
              setEditing(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
              tab === t.id
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {t.label}
            <span
              className={`ml-2 inline-flex min-w-6 justify-center px-1.5 py-0.5 rounded-md text-xs ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-500 -mt-2">{tabs.find((t) => t.id === tab)?.hint}</p>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <input
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
            placeholder={
              tab === 'areas'
                ? 'Buscar área…'
                : tab === 'categorias'
                  ? 'Buscar categoría o subcategoría…'
                  : 'Buscar responsable…'
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {tab === 'areas' && (
          <div className="p-4 space-y-4">
            {canEdit && (
              <form onSubmit={addArea} className="flex flex-wrap gap-2">
                <input
                  className="flex-1 min-w-[220px] border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Nombre del área nueva"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  required
                />
                <button className="px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold">
                  Agregar área
                </button>
              </form>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {areasFiltradas.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-100 bg-stone-50/80"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <NameCell tipo="area" id={a.id} name={a.name} active={a.active} />
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                        a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {a.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <RowActions tipo="area" id={a.id} name={a.name} active={a.active} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'categorias' && (
          <div className="p-4 space-y-5">
            {canEdit && (
              <div className="grid lg:grid-cols-2 gap-3">
                <form onSubmit={addCat} className="rounded-xl border border-stone-200 p-3 space-y-2 bg-stone-50/50">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Nueva categoría</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                      placeholder="Ej. Mantenimiento"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      required
                    />
                    <button className="px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold shrink-0">
                      Agregar
                    </button>
                  </div>
                </form>
                <form onSubmit={addSub} className="rounded-xl border border-primary-100 p-3 space-y-2 bg-primary-50/40">
                  <p className="text-xs font-semibold text-primary-800 uppercase tracking-wide">
                    Nueva subcategoría
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white min-w-[160px] flex-1"
                      value={subCatId}
                      onChange={(e) => setSubCatId(e.target.value)}
                      required
                    >
                      <option value="">Categoría padre…</option>
                      {categorias.filter((c) => c.active).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 min-w-[140px] border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                      placeholder="Nombre subcategoría"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      required
                    />
                    <button className="px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold shrink-0">
                      Agregar
                    </button>
                  </div>
                  {catSeleccionada && (
                    <p className="text-xs text-primary-700">
                      Se agregará bajo <strong>{catSeleccionada.name}</strong>
                    </p>
                  )}
                </form>
              </div>
            )}

            <div className="space-y-3">
              {catsFiltradas.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 ${
                    c.id === subCatId ? 'border-primary-300 bg-primary-50/30' : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <button type="button" onClick={() => setSubCatId(c.id)} className="flex-1 min-w-0 text-left">
                      <NameCell tipo="categoria" id={c.id} name={c.name} active={c.active} />
                    </button>
                    <span className="text-xs text-stone-500 font-medium">
                      {c.subcategorias.length} sub
                    </span>
                    <RowActions tipo="categoria" id={c.id} name={c.name} active={c.active} />
                  </div>
                  {c.subcategorias.length === 0 ? (
                    <p className="text-sm text-stone-400">Sin subcategorías aún</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.subcategorias.map((s: Subcategoria & { active?: boolean }) => (
                        <div
                          key={s.id}
                          className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-xs font-medium border ${
                            s.active === false
                              ? 'bg-stone-100 border-stone-200 text-stone-400'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}
                        >
                          {editing?.tipo === 'subcategoria' && editing.id === s.id ? (
                            <input
                              autoFocus
                              className="w-28 border border-primary-300 rounded px-1 py-0.5 text-xs"
                              value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditing(null);
                              }}
                            />
                          ) : (
                            <span className={s.active === false ? 'line-through' : ''}>{s.name}</span>
                          )}
                          <RowActions
                            tipo="subcategoria"
                            id={s.id}
                            name={s.name}
                            active={s.active !== false}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'responsables' && (
          <div className="p-4 space-y-4">
            {canEdit && (
              <form onSubmit={addResp} className="flex flex-wrap gap-2">
                <input
                  className="flex-1 min-w-[220px] border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Nombre del responsable"
                  value={respName}
                  onChange={(e) => setRespName(e.target.value)}
                  required
                />
                <button className="px-4 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold">
                  Agregar responsable
                </button>
              </form>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[28rem] overflow-auto pr-1">
              {respsFiltrados.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-100 bg-stone-50/80"
                >
                  <div className="flex-1 min-w-0">
                    <NameCell tipo="responsable" id={r.id} name={r.name} active={r.active} />
                  </div>
                  <RowActions tipo="responsable" id={r.id} name={r.name} active={r.active} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
