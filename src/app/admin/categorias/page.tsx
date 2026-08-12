'use client';

import { useState, useEffect, useCallback } from 'react';

interface CategoriaInfo {
  nombre: string;
  cantidad: number;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch('/api/productos');
      if (res.ok) {
        const data = await res.json();
        const productos = data?.data ?? [];
        
        // Derive unique categories with product count
        const catMap = new Map<string, number>();
        productos.forEach((p: { categoria: string }) => {
          catMap.set(p.categoria, (catMap.get(p.categoria) || 0) + 1);
        });
        
        const cats = Array.from(catMap.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setCategorias(cats);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);

  const agregarCategoria = () => {
    const name = nuevaCategoria.trim().toLowerCase();
    if (!name) return;
    if (categorias.some(c => c.nombre === name)) {
      setMensaje('Esa categoría ya existe');
      setTimeout(() => setMensaje(null), 3000);
      return;
    }
    // Just show it — it'll be "official" when a product is created with it
    setCategorias([...categorias, { nombre: name, cantidad: 0 }]);
    setNuevaCategoria('');
    setMensaje('Categoría agregada. Aparecerá en el menú cuando tenga productos.');
    setTimeout(() => setMensaje(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Categorías</h1>
        <p className="text-sm text-gray-500 mt-1">Las categorías se crean automáticamente al agregar productos. Aquí puedes ver las existentes.</p>
      </div>

      {/* Add new category */}
      <div className="flex gap-3">
        <input
          type="text"
          value={nuevaCategoria}
          onChange={(e) => setNuevaCategoria(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
          placeholder="Nueva categoría..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
        />
        <button
          onClick={agregarCategoria}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-200"
        >
          Agregar
        </button>
      </div>

      {mensaje && (
        <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs">{mensaje}</div>
      )}

      {/* Categories list */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 divide-y divide-white/5">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin h-6 w-6 border-2 border-brand-400 border-t-transparent rounded-full mx-auto" /></div>
        ) : categorias.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No hay categorías aún</div>
        ) : (
          categorias.map((cat) => (
            <div key={cat.nombre} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors duration-150">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <span className="text-sm">📂</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-white capitalize">{cat.nombre}</span>
                  <p className="text-[10px] text-gray-500">{cat.cantidad} producto{cat.cantidad !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                Activa
              </span>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-600">
        Las categorías aparecen automáticamente en el menú del cliente cuando tienen al menos un producto activo.
      </p>
    </div>
  );
}
