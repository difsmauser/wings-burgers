'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagen?: string;
  activo: boolean;
  disponible: boolean;
}

const CATEGORIAS = ['alitas', 'hamburguesas', 'bebidas', 'otros'];

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('alitas');
  const [precio, setPrecio] = useState('');
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProductos = useCallback(async () => {
    try {
      const res = await fetch('/api/productos?includeInactive=true');
      const data = await res.json();
      setProductos(data?.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setCategoria('alitas');
    setPrecio('');
    setImagenFile(null);
    setImagenPreview(null);
    setEditingProduct(null);
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (producto: Producto) => {
    setEditingProduct(producto);
    setNombre(producto.nombre);
    setDescripcion(producto.descripcion || '');
    setCategoria(producto.categoria);
    setPrecio(String(producto.precio));
    setImagenPreview(producto.imagen || null);
    setImagenFile(null);
    setError(null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagenPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.data?.url ?? null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!nombre.trim() || !precio.trim()) {
      setError('Nombre y precio son requeridos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let imagenUrl = editingProduct?.imagen || null;

      // Upload image if new file selected
      if (imagenFile) {
        const uploaded = await uploadImage(imagenFile);
        if (uploaded) imagenUrl = uploaded;
      }

      const body = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria,
        precio: parseFloat(precio),
        imagenUrl,
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/productos/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || 'Error al guardar');
      }

      setShowModal(false);
      resetForm();
      fetchProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (producto: Producto) => {
    try {
      await fetch(`/api/productos/${producto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !producto.activo }),
      });
      setProductos(prev => prev.map(p =>
        p.id === producto.id ? { ...p, activo: !p.activo } : p
      ));
    } catch {
      // silent
    }
  };

  const deleteProducto = async (id: string) => {
    try {
      await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch {
      // silent
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">{productos.length} productos en el catálogo</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-200"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Products Table */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                </tr>
              ))
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.imagen ? (
                          <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">🍗</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.nombre}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.descripcion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 capitalize">{p.categoria}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-white">
                    ${Number(p.precio).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleActivo(p)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                        p.activo
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-green-400' : 'bg-red-400'}`} />
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteProducto(p.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-5">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Alitas BBQ"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                />
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del producto..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200 resize-none"
                />
              </div>

              {/* Categoria & Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#16161f] text-white capitalize">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Precio (final) *</label>
                  <input
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="180.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Imagen</label>
                <div className="flex items-center gap-3">
                  {imagenPreview && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                      <img src={imagenPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-3 rounded-lg border border-dashed border-white/10 hover:border-brand-500/30 text-xs text-gray-400 hover:text-white transition-all duration-200 text-center"
                  >
                    {imagenPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
