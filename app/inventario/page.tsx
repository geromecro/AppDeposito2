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
    </main>
  );
}
