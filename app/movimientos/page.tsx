'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { MovimientoCard } from '@/components/MovimientoCard';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABELS, TipoMovimiento, VENDEDORES } from '@/lib/constants';

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
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-100">
        <div className="w-8 h-8 border-2 border-surface-300 border-t-surface-700 rounded-full animate-spin" />
      </div>
    }>
      <MovimientosContent />
    </Suspense>
  );
}

function MovimientosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | ''>('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroProductoId, setFiltroProductoId] = useState<string | null>(null);
  const [productoNombre, setProductoNombre] = useState<string | null>(null);
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

    const productoIdParam = searchParams.get('productoId');
    if (productoIdParam) {
      setFiltroProductoId(productoIdParam);
    }
  }, [router, searchParams]);

  const fetchMovimientos = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (filtroVendedor) params.set('vendedor', filtroVendedor);
      if (filtroProductoId) params.set('productoId', filtroProductoId);
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);

      const res = await fetch(`/api/movimientos?${params.toString()}`);
      const data = await res.json();
      setMovimientos(data.movimientos || []);

      if (filtroProductoId && data.movimientos?.length > 0) {
        setProductoNombre(data.movimientos[0].producto.codigo);
      }
    } catch (error) {
      console.error('Error fetching movimientos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filtroTipo, filtroVendedor, filtroProductoId, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (vendedor) {
      fetchMovimientos();
    }
  }, [vendedor, fetchMovimientos]);

  const handleLogout = () => {
    localStorage.removeItem('vendedor');
    router.push('/');
  };

  const tipoButtonStyles = {
    ENTRADA: {
      active: 'bg-accent-500 text-white shadow-sm',
      inactive: 'bg-accent-50 text-accent-700 border border-accent-200 hover:border-accent-300',
    },
    TRASLADO: {
      active: 'bg-transfer-500 text-white shadow-sm',
      inactive: 'bg-transfer-50 text-transfer-700 border border-transfer-200 hover:border-transfer-300',
    },
    SALIDA: {
      active: 'bg-warning-500 text-white shadow-sm',
      inactive: 'bg-warning-50 text-warning-700 border border-warning-200 hover:border-warning-300',
    },
  };

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
            <div className="flex items-center gap-3">
              <Link href="/inventario">
                <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-200 rounded-xl transition-colors">
                  <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-surface-900">Historial</h1>
                <p className="text-sm text-surface-500">Movimientos registrados</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>

          {/* Product filter badge */}
          {filtroProductoId && productoNombre && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-surface-500">Producto:</span>
              <span className="
                bg-transfer-100 text-transfer-700 border border-transfer-200
                px-3 py-1.5 rounded-xl text-sm font-semibold
                flex items-center gap-2
              ">
                <span className="font-code">{productoNombre}</span>
                <button
                  onClick={() => {
                    setFiltroProductoId(null);
                    setProductoNombre(null);
                    router.replace('/movimientos');
                  }}
                  className="hover:bg-transfer-200 rounded-full p-0.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
          )}

          {/* Type filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              onClick={() => setFiltroTipo('')}
              className={`
                px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                ${filtroTipo === ''
                  ? 'bg-surface-900 text-white shadow-sm'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                }
              `}
            >
              Todos
            </button>
            {TIPOS_MOVIMIENTO.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200
                  ${filtroTipo === tipo
                    ? tipoButtonStyles[tipo].active
                    : tipoButtonStyles[tipo].inactive
                  }
                `}
              >
                {TIPO_MOVIMIENTO_LABELS[tipo]}
              </button>
            ))}
          </div>

          {/* Vendor filter */}
          <div className="mb-4">
            <select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
              className="
                w-full px-4 py-3 text-sm
                bg-white border border-surface-200 rounded-xl
                text-surface-900
                focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent
                transition-all duration-200
              "
            >
              <option value="">Todos los vendedores</option>
              {VENDEDORES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Date filters */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-surface-500 mb-1 font-medium">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="
                  w-full px-3 py-2.5 text-sm
                  bg-white border border-surface-200 rounded-xl
                  text-surface-900
                  focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent
                  transition-all duration-200
                "
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-surface-500 mb-1 font-medium">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="
                  w-full px-3 py-2.5 text-sm
                  bg-white border border-surface-200 rounded-xl
                  text-surface-900
                  focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent
                  transition-all duration-200
                "
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="
                  px-3 py-2.5 text-sm font-medium
                  text-surface-600 hover:bg-surface-200
                  rounded-xl transition-colors
                "
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Movements list */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-20 skeleton" />
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-200 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-surface-600 font-medium">No hay movimientos</p>
            <p className="text-sm text-surface-400 mt-1">
              Registra una entrada, traslado o salida
            </p>
          </div>
        ) : (
          movimientos.map((mov, index) => (
            <div
              key={mov.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <MovimientoCard
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
            </div>
          ))
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchMovimientos}
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
    </main>
  );
}
