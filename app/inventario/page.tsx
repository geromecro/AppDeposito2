'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

interface Movimiento {
  id: number;
  tipo: 'ENTRADA' | 'TRASLADO' | 'SALIDA';
  cantidad: number;
  ubicacionOrigen: string | null;
  ubicacionDestino: string | null;
  vendedor: string;
  createdAt: string;
}

export default function InventarioPage() {
  const router = useRouter();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');
  const [sinStock, setSinStock] = useState(false);
  const [ordenamiento, setOrdenamiento] = useState<'default' | 'mayor' | 'menor'>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [vendedor, setVendedor] = useState<string | null>(null);

  // Estados para modal de detalle e imagen fullscreen
  const [viewingProduct, setViewingProduct] = useState<StockItem | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState<string | null>(null);
  const [productMovimientos, setProductMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [cachedMovimientos, setCachedMovimientos] = useState<Record<number, Movimiento[]>>({});

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
    setProductMovimientos([]);
  };

  // Cargar movimientos cuando se abre el modal (con cache)
  useEffect(() => {
    if (viewingProduct) {
      const productId = viewingProduct.producto.id;

      // Usar cache si existe
      if (cachedMovimientos[productId]) {
        setProductMovimientos(cachedMovimientos[productId]);
        return;
      }

      setLoadingMovimientos(true);
      fetch(`/api/movimientos?productoId=${productId}&limit=5`)
        .then(res => res.json())
        .then(data => {
          const movimientos = data.movimientos || [];
          setProductMovimientos(movimientos);
          setCachedMovimientos(prev => ({ ...prev, [productId]: movimientos }));
        })
        .catch(console.error)
        .finally(() => setLoadingMovimientos(false));
    }
  }, [viewingProduct, cachedMovimientos]);

  // Ordenar stock según el criterio seleccionado
  const stockOrdenado = useMemo(() => {
    if (ordenamiento === 'mayor') {
      return [...stock].sort((a, b) => b.total - a.total);
    }
    if (ordenamiento === 'menor') {
      return [...stock].sort((a, b) => a.total - b.total);
    }
    return stock;
  }, [stock, ordenamiento]);

  if (!vendedor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 glass border-b border-surface-200 z-10">
        <div className="px-4 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-surface-900">Inventario</h1>
              <p className="text-sm text-surface-500">Hola, {vendedor}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/movimientos" title="Historial">
                <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Button>
              </Link>
              <Link href="/resumen" title="Resumen">
                <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-10 h-10 p-0" onClick={handleLogout} title="Salir">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Totals */}
          {totales && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-transfer-50 border border-transfer-100 rounded-xl px-3 py-2 text-center">
                <p className="text-lg font-bold text-transfer-700">{totales.unidadesDeposito}</p>
                <p className="text-xs text-transfer-600">Depósito</p>
              </div>
              <div className="bg-accent-50 border border-accent-100 rounded-xl px-3 py-2 text-center">
                <p className="text-lg font-bold text-accent-700">{totales.unidadesLocal}</p>
                <p className="text-xs text-accent-600">Local</p>
              </div>
              <div className="bg-surface-200 rounded-xl px-3 py-2 text-center">
                <p className="text-lg font-bold text-surface-800">{totales.unidadesTotal}</p>
                <p className="text-xs text-surface-600">Total</p>
              </div>
            </div>
          )}

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código o descripción..."
          />

          {/* Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              onClick={() => { setFiltroUbicacion(''); setSinStock(false); }}
              className={`
                px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                ${filtroUbicacion === '' && !sinStock
                  ? 'bg-surface-900 text-white shadow-sm'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                }
              `}
            >
              Todos
            </button>
            {UBICACIONES.map((ubi) => (
              <button
                key={ubi}
                onClick={() => { setFiltroUbicacion(ubi); setSinStock(false); }}
                className={`
                  px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                  ${filtroUbicacion === ubi
                    ? 'bg-surface-900 text-white shadow-sm'
                    : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                  }
                `}
              >
                {ubi}
              </button>
            ))}
            <button
              onClick={() => { setFiltroUbicacion(''); setSinStock(true); }}
              className={`
                px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                ${sinStock
                  ? 'bg-warning-500 text-white shadow-sm'
                  : 'bg-warning-50 text-warning-700 border border-warning-200 hover:border-warning-300'
                }
              `}
            >
              Sin stock
            </button>

            <div className="w-px h-8 bg-surface-200 mx-1 flex-shrink-0" />

            <button
              onClick={() => setOrdenamiento(ordenamiento === 'mayor' ? 'default' : 'mayor')}
              className={`
                px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-1.5
                ${ordenamiento === 'mayor'
                  ? 'bg-surface-900 text-white shadow-sm'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Mayor
            </button>
            <button
              onClick={() => setOrdenamiento(ordenamiento === 'menor' ? 'default' : 'menor')}
              className={`
                px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200 flex items-center gap-1.5
                ${ordenamiento === 'menor'
                  ? 'bg-surface-900 text-white shadow-sm'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Menor
            </button>
          </div>
        </div>
      </header>

      {/* Stock list */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-24 skeleton" />
            ))}
          </div>
        ) : stockOrdenado.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-200 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-surface-600 font-medium">No hay productos</p>
            <p className="text-sm text-surface-400 mt-1">
              Registra una entrada para comenzar
            </p>
          </div>
        ) : (
          stockOrdenado.map((item, index) => (
            <div
              key={item.producto.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <StockCard
                producto={item.producto}
                stockDeposito={item.stockDeposito}
                stockLocal={item.stockLocal}
                total={item.total}
                onClick={() => handleViewProduct(item)}
              />
            </div>
          ))
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchStock}
        disabled={isLoading}
        className="
          fixed bottom-24 right-4 w-12 h-12
          bg-white text-surface-600 border border-surface-200
          rounded-full shadow-lg
          flex items-center justify-center
          hover:bg-surface-50 hover:border-surface-300
          transition-all duration-200 press-effect
          disabled:opacity-50
        "
        aria-label="Actualizar"
      >
        <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* FAB - New movement */}
      <Link
        href="/movimientos/nuevo"
        className="
          fixed bottom-6 right-4 w-14 h-14
          bg-surface-900 text-white
          rounded-full shadow-lg shadow-surface-900/30
          flex items-center justify-center
          hover:bg-surface-800 hover:shadow-xl
          transition-all duration-200 press-effect
        "
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Product detail modal */}
      {viewingProduct && (
        <div
          className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setViewingProduct(null)}
        >
          <div
            className="
              bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl
              max-h-[90vh] overflow-hidden
              animate-slide-up shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-surface-300 rounded-full" />
            </div>

            {/* Photo */}
            {viewingProduct.producto.fotoUrl ? (
              <button
                onClick={() => setImageFullscreen(viewingProduct.producto.fotoUrl)}
                className="w-full cursor-zoom-in relative group"
              >
                <img
                  src={viewingProduct.producto.fotoUrl}
                  alt={viewingProduct.producto.descripcion}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="w-full h-32 bg-surface-100 flex items-center justify-center">
                <svg className="w-12 h-12 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Info */}
            <div className="p-5">
              <h2 className="font-code text-2xl font-bold text-surface-900 mb-1">
                {viewingProduct.producto.codigo}
              </h2>
              <p className="text-surface-600 mb-5">{viewingProduct.producto.descripcion}</p>

              {/* Stock grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-transfer-50 border border-transfer-100 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-transfer-700">{viewingProduct.stockDeposito}</p>
                  <p className="text-xs text-transfer-600 font-medium">Depósito</p>
                </div>
                <div className="bg-accent-50 border border-accent-100 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-accent-700">{viewingProduct.stockLocal}</p>
                  <p className="text-xs text-accent-600 font-medium">Local</p>
                </div>
                <div className="bg-surface-100 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-surface-800">{viewingProduct.total}</p>
                  <p className="text-xs text-surface-500 font-medium">Total</p>
                </div>
              </div>

              {/* Recent movements */}
              <div className="border-t border-surface-100 pt-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-surface-700">Últimos movimientos</h3>
                  {productMovimientos.length > 0 && (
                    <Link
                      href={`/movimientos?productoId=${viewingProduct.producto.id}`}
                      className="text-xs text-transfer-600 hover:text-transfer-700 font-medium"
                    >
                      Ver todo →
                    </Link>
                  )}
                </div>
                {loadingMovimientos ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-8 skeleton rounded-lg" />
                    ))}
                  </div>
                ) : productMovimientos.length === 0 ? (
                  <p className="text-sm text-surface-400 text-center py-3">Sin movimientos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {productMovimientos.map((mov) => (
                      <div key={mov.id} className="flex items-center gap-2 text-sm bg-surface-50 rounded-lg px-3 py-2">
                        <span className={`
                          px-2 py-0.5 rounded-md text-xs font-semibold
                          ${mov.tipo === 'ENTRADA' ? 'bg-accent-100 text-accent-700' :
                            mov.tipo === 'TRASLADO' ? 'bg-transfer-100 text-transfer-700' :
                            'bg-warning-100 text-warning-700'
                          }
                        `}>
                          {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SALIDA' ? '-' : '↔'}
                          {mov.cantidad}
                        </span>
                        <span className="text-surface-600 flex-1 truncate text-xs">
                          {mov.tipo === 'ENTRADA' ? `→ ${mov.ubicacionDestino}` :
                           mov.tipo === 'SALIDA' ? `← ${mov.ubicacionOrigen}` :
                           `${mov.ubicacionOrigen} → ${mov.ubicacionDestino}`}
                        </span>
                        <span className="text-surface-400 text-xs">
                          {new Date(mov.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <p className="text-xs text-surface-400 mb-2 text-center font-medium">Acción rápida</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Link
                  href={`/movimientos/nuevo?productoId=${viewingProduct.producto.id}&tipo=ENTRADA`}
                  className="
                    flex flex-col items-center gap-1.5 p-3 rounded-xl
                    bg-accent-50 text-accent-700 border border-accent-100
                    hover:bg-accent-100 transition-colors press-effect
                  "
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-semibold">Entrada</span>
                </Link>
                <Link
                  href={`/movimientos/nuevo?productoId=${viewingProduct.producto.id}&tipo=TRASLADO`}
                  className="
                    flex flex-col items-center gap-1.5 p-3 rounded-xl
                    bg-transfer-50 text-transfer-700 border border-transfer-100
                    hover:bg-transfer-100 transition-colors press-effect
                  "
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="text-xs font-semibold">Traslado</span>
                </Link>
                <Link
                  href={`/movimientos/nuevo?productoId=${viewingProduct.producto.id}&tipo=SALIDA`}
                  className="
                    flex flex-col items-center gap-1.5 p-3 rounded-xl
                    bg-warning-50 text-warning-700 border border-warning-100
                    hover:bg-warning-100 transition-colors press-effect
                  "
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  <span className="text-xs font-semibold">Salida</span>
                </Link>
              </div>

              <button
                onClick={() => setViewingProduct(null)}
                className="
                  w-full px-4 py-3 rounded-xl font-semibold
                  bg-surface-100 text-surface-700
                  hover:bg-surface-200 transition-colors press-effect
                "
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {imageFullscreen && (
        <div
          className="fixed inset-0 bg-surface-950/95 flex items-center justify-center z-[60] cursor-zoom-out"
          onClick={() => setImageFullscreen(null)}
        >
          <button
            onClick={() => setImageFullscreen(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imageFullscreen}
            alt="Imagen completa"
            className="max-w-full max-h-full object-contain p-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
