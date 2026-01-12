'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { MovimientoCard } from '@/components/MovimientoCard';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABELS, TipoMovimiento } from '@/lib/constants';

interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  ubicacionOrigen: string | null;
  ubicacionDestino: string | null;
  vendedor: string;
  nota: string | null;
  createdAt: string;
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    fotoUrl: string | null;
  };
}

export default function MovimientosPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
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

  const fetchMovimientos = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);

      const res = await fetch(`/api/movimientos?${params.toString()}`);
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filtroTipo, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (vendedor) {
      fetchMovimientos();
    }
  }, [vendedor, fetchMovimientos]);

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
            <div className="flex items-center gap-3">
              <Link href="/inventario">
                <button className="p-1 hover:bg-primary-100 rounded">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-primary-900">Historial</h1>
                <p className="text-sm text-primary-500">Movimientos registrados</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>

          {/* Filtros por tipo */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setFiltroTipo('')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filtroTipo === ''
                  ? 'bg-primary-800 text-white'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              Todos
            </button>
            {TIPOS_MOVIMIENTO.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filtroTipo === tipo
                    ? 'bg-primary-800 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {TIPO_MOVIMIENTO_LABELS[tipo]}
              </button>
            ))}
          </div>

          {/* Filtros por fecha */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-primary-500 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-primary-500 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="self-end px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-100 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Lista de movimientos */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-primary-500">Cargando...</div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-primary-500">No hay movimientos registrados</p>
            <p className="text-sm text-primary-400 mt-1">
              Registra una entrada, traslado o salida
            </p>
          </div>
        ) : (
          movimientos.map((mov) => (
            <MovimientoCard
              key={mov.id}
              id={mov.id}
              tipo={mov.tipo}
              cantidad={mov.cantidad}
              ubicacionOrigen={mov.ubicacionOrigen}
              ubicacionDestino={mov.ubicacionDestino}
              vendedor={mov.vendedor}
              nota={mov.nota}
              createdAt={mov.createdAt}
              producto={mov.producto}
            />
          ))
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchMovimientos}
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
