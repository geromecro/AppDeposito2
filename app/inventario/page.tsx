'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { StockCard } from '@/components/StockCard';
import { UBICACIONES } from '@/lib/constants';

interface StockItem {
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    fotoUrl: string | null;
  };
  stockDeposito: number;
  stockLocal: number;
  total: number;
}

interface Totales {
  productos: number;
  unidadesDeposito: number;
  unidadesLocal: number;
  unidadesTotal: number;
}

export default function InventarioPage() {
  const router = useRouter();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [sinStock, setSinStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vendedor, setVendedor] = useState<string | null>(null);

  // Estados para modal de detalle e imagen fullscreen
  const [viewingProduct, setViewingProduct] = useState<StockItem | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState<string | null>(null);

  useEffect(() => {
    const storedVendedor = localStorage.getItem('vendedor');
    if (!storedVendedor) {
      router.push('/');
      return;
    }
    setVendedor(storedVendedor);
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStock = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filtroUbicacion) params.set('ubicacion', filtroUbicacion);
      if (sinStock) params.set('sinStock', 'true');

      const res = await fetch(`/api/stock?${params.toString()}`);
      const data = await res.json();
      setStock(data.stock || []);
      setTotales(data.totales || null);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filtroUbicacion, sinStock]);

  useEffect(() => {
    if (vendedor) {
      fetchStock();
    }
  }, [vendedor, fetchStock]);

  const handleLogout = () => {
    localStorage.removeItem('vendedor');
    router.push('/');
  };

  const handleViewProduct = (item: StockItem) => {
    setViewingProduct(item);
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
              <h1 className="text-lg font-bold text-primary-900">Inventario</h1>
              <p className="text-sm text-primary-500">Hola, {vendedor}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/movimientos">
                <Button variant="ghost" size="sm">
                  Historial
                </Button>
              </Link>
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

          {/* Totales */}
          {totales && (
            <div className="flex gap-3 mb-3 text-sm">
              <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                <span className="font-medium">Dep:</span> {totales.unidadesDeposito}
              </div>
              <div className="bg-accent-50 text-accent-700 px-3 py-1.5 rounded-lg">
                <span className="font-medium">Local:</span> {totales.unidadesLocal}
              </div>
              <div className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg">
                <span className="font-medium">Total:</span> {totales.unidadesTotal}
              </div>
            </div>
          )}

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por codigo o descripcion..."
          />

          {/* Filtros */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => { setFiltroUbicacion(''); setSinStock(false); }}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filtroUbicacion === '' && !sinStock
                  ? 'bg-primary-800 text-white'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              Todos
            </button>
            {UBICACIONES.map((ubi) => (
              <button
                key={ubi}
                onClick={() => { setFiltroUbicacion(ubi); setSinStock(false); }}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filtroUbicacion === ubi
                    ? 'bg-primary-800 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {ubi}
              </button>
            ))}
            <button
              onClick={() => { setFiltroUbicacion(''); setSinStock(true); }}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                sinStock
                  ? 'bg-warning-600 text-white'
                  : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
              }`}
            >
              Sin stock
            </button>
          </div>
        </div>
      </header>

      {/* Lista de stock */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-primary-500">Cargando...</div>
        ) : stock.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-primary-500">No hay productos en inventario</p>
            <p className="text-sm text-primary-400 mt-1">
              Registra una entrada para comenzar
            </p>
          </div>
        ) : (
          stock.map((item) => (
            <StockCard
              key={item.producto.id}
              producto={item.producto}
              stockDeposito={item.stockDeposito}
              stockLocal={item.stockLocal}
              total={item.total}
              onClick={() => handleViewProduct(item)}
            />
          ))
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchStock}
        className="fixed bottom-24 right-4 w-12 h-12 bg-primary-200 text-primary-700 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-300 transition-colors"
        aria-label="Actualizar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* FAB - Nuevo movimiento */}
      <Link
        href="/movimientos/nuevo"
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-900 transition-colors"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

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
            {viewingProduct.producto.fotoUrl ? (
              <button
                onClick={() => setImageFullscreen(viewingProduct.producto.fotoUrl)}
                className="w-full cursor-zoom-in"
              >
                <img
                  src={viewingProduct.producto.fotoUrl}
                  alt={viewingProduct.producto.descripcion}
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
              <h2 className="text-xl font-bold text-primary-900 mb-2">
                {viewingProduct.producto.codigo}
              </h2>
              <p className="text-primary-700 mb-4">{viewingProduct.producto.descripcion}</p>

              {/* Stock por ubicación */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{viewingProduct.stockDeposito}</div>
                  <div className="text-xs">Depósito</div>
                </div>
                <div className="bg-accent-50 text-accent-700 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{viewingProduct.stockLocal}</div>
                  <div className="text-xs">Local</div>
                </div>
                <div className="bg-primary-100 text-primary-700 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{viewingProduct.total}</div>
                  <div className="text-xs">Total</div>
                </div>
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
