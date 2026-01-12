'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { ProductoCard } from '@/components/ProductoCard';
import { UBICACIONES } from '@/lib/constants';

interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  fotoUrl: string | null;
  vendedor: string;
  ubicacion: string | null;
  createdAt: string;
}

export default function TransferenciasPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [vendedor, setVendedor] = useState<string | null>(null);

  // Estados para ver/editar/eliminar
  const [viewingProduct, setViewingProduct] = useState<Producto | null>(null);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Producto | null>(null);
  const [editForm, setEditForm] = useState({ codigo: '', descripcion: '', cantidad: 1, ubicacion: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState<string | null>(null);

  useEffect(() => {
    const storedVendedor = localStorage.getItem('vendedor');
    if (!storedVendedor) {
      router.push('/');
      return;
    }
    setVendedor(storedVendedor);
  }, [router]);

  // Debounce para la búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProductos = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filtroUbicacion) params.set('ubicacion', filtroUbicacion);

      const res = await fetch(`/api/productos?${params.toString()}`);
      const data = await res.json();
      setProductos(data.productos || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filtroUbicacion]);

  useEffect(() => {
    if (vendedor) {
      fetchProductos();
    }
  }, [vendedor, fetchProductos]);

  const handleLogout = () => {
    localStorage.removeItem('vendedor');
    router.push('/');
  };

  // Abrir modal de detalle
  const handleView = (id: number) => {
    const product = productos.find((p) => p.id === id);
    if (product) setViewingProduct(product);
  };

  // Abrir modal de edición
  const handleEdit = (id: number) => {
    const product = productos.find((p) => p.id === id);
    if (product) {
      setEditingProduct(product);
      setEditForm({
        codigo: product.codigo,
        descripcion: product.descripcion,
        cantidad: product.cantidad,
        ubicacion: product.ubicacion || '',
      });
    }
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/productos/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setEditingProduct(null);
      fetchProductos();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal de eliminación
  const handleDelete = (id: number) => {
    const product = productos.find((p) => p.id === id);
    if (product) {
      setDeletingProduct(product);
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/productos/${deletingProduct.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      setDeletingProduct(null);
      fetchProductos();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  if (!vendedor) {
    return null;
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-primary-200 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-primary-900">Transferencias</h1>
              <p className="text-sm text-primary-500">Hola, {vendedor}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/resumen">
                <Button variant="ghost" size="sm">
                  Resumen
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Salir
              </Button>
            </div>
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por codigo o descripcion..."
          />
          {/* Filtro por ubicacion */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFiltroUbicacion('')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filtroUbicacion === '' 
                  ? 'bg-primary-800 text-white' 
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              Todos
            </button>
            {UBICACIONES.map((ubi) => (
              <button
                key={ubi}
                onClick={() => setFiltroUbicacion(ubi)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filtroUbicacion === ubi 
                    ? 'bg-primary-800 text-white' 
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {ubi}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Lista de productos */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-primary-500">Cargando...</div>
        ) : productos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-primary-500">No hay productos registrados</p>
            <p className="text-sm text-primary-400 mt-1">
              Toca el boton + para agregar el primero
            </p>
          </div>
        ) : (
          productos.map((producto) => (
            <ProductoCard
              key={producto.id}
              id={producto.id}
              codigo={producto.codigo}
              descripcion={producto.descripcion}
              cantidad={producto.cantidad}
              vendedor={producto.vendedor}
              fotoUrl={producto.fotoUrl}
              ubicacion={producto.ubicacion}
              createdAt={producto.createdAt}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchProductos}
        className="fixed bottom-24 right-4 w-12 h-12 bg-primary-200 text-primary-700 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-300 transition-colors"
        aria-label="Actualizar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* FAB - Agregar nuevo */}
      <Link
        href="/transferencias/nueva"
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-900 transition-colors"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Modal de edición */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-primary-200">
              <h2 className="text-lg font-semibold text-primary-900">Editar producto</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Código</label>
                <input
                  type="text"
                  value={editForm.codigo}
                  onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.cantidad}
                  onChange={(e) => setEditForm({ ...editForm, cantidad: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Ubicacion</label>
                <select
                  value={editForm.ubicacion}
                  onChange={(e) => setEditForm({ ...editForm, ubicacion: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar...</option>
                  {UBICACIONES.map((ubi) => (
                    <option key={ubi} value={ubi}>{ubi}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-primary-200 flex gap-3">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-primary-900 mb-2">Eliminar producto</h2>
              <p className="text-primary-600">
                ¿Estás seguro que deseas eliminar <strong>{deletingProduct.codigo}</strong>?
              </p>
              <p className="text-sm text-primary-500 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="p-4 border-t border-primary-200 flex gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de producto */}
      {viewingProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingProduct(null)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Foto */}
            {viewingProduct.fotoUrl ? (
              <button
                onClick={() => setImageFullscreen(viewingProduct.fotoUrl)}
                className="w-full cursor-zoom-in"
              >
                <img
                  src={viewingProduct.fotoUrl}
                  alt={viewingProduct.descripcion}
                  className="w-full h-64 object-cover"
                />
              </button>
            ) : (
              <div className="w-full h-40 bg-primary-100 flex items-center justify-center">
                <svg className="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-primary-900">{viewingProduct.codigo}</h2>
                {viewingProduct.ubicacion && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    viewingProduct.ubicacion === 'Local' 
                      ? 'bg-accent-100 text-accent-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {viewingProduct.ubicacion}
                  </span>
                )}
                <span className="bg-primary-100 text-primary-800 text-sm font-medium px-3 py-1 rounded">
                  x{viewingProduct.cantidad}
                </span>
              </div>

              <p className="text-primary-700 mb-4">{viewingProduct.descripcion}</p>

              <div className="flex items-center justify-between text-sm text-primary-500 border-t border-primary-100 pt-3">
                <span>{viewingProduct.vendedor}</span>
                <span>
                  {new Date(viewingProduct.createdAt).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Botón cerrar */}
            <div className="p-4 border-t border-primary-200">
              <button
                onClick={() => setViewingProduct(null)}
                className="w-full px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para imagen a pantalla completa */}
      {imageFullscreen && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] cursor-zoom-out"
          onClick={() => setImageFullscreen(null)}
        >
          <button
            onClick={() => setImageFullscreen(null)}
            className="absolute top-4 right-4 text-white hover:text-primary-300 z-10"
            aria-label="Cerrar"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imageFullscreen}
            alt="Imagen completa"
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
