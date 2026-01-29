'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

interface Stats {
  totalProductos: number;
  totalUnidades: number;
  productosDia: number;
  porVendedor: {
    vendedor: string;
    registros: number;
    unidades: number;
  }[];
}

const formatDateForInput = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function ResumenPage() {
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(formatDateForInput(new Date()));

  const [fechaDesde, setFechaDesde] = useState(() => {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    return formatDateForInput(hace30Dias);
  });
  const [fechaHasta, setFechaHasta] = useState(formatDateForInput(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const storedVendedor = localStorage.getItem('vendedor');
    if (!storedVendedor) {
      router.push('/');
      return;
    }
    fetchStats(fechaSeleccionada);
  }, [router, fechaSeleccionada]);

  const fetchStats = async (fecha: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/stats?fecha=${fecha}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/export?desde=${fechaDesde}&hasta=${fechaHasta}`);
      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimientos_${fechaDesde}_${fechaHasta}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Archivo descargado');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface-300 border-t-surface-700 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-100 pb-8">
      {/* Header */}
      <header className="sticky top-0 glass border-b border-surface-200 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/inventario">
              <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-200 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>
            <h1 className="text-xl font-bold text-surface-900">Resumen</h1>
          </div>

          {/* Date selector */}
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            max={formatDateForInput(new Date())}
            className="
              w-full px-4 py-3
              bg-white border border-surface-200 rounded-xl
              text-surface-900 font-medium
              focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent
              transition-all duration-200
            "
          />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-surface-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-surface-900">
              {stats?.totalProductos || 0}
            </p>
            <p className="text-sm text-surface-500 mt-1">Registros totales</p>
          </div>

          <div className="bg-white border border-surface-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-surface-900">
              {stats?.totalUnidades || 0}
            </p>
            <p className="text-sm text-surface-500 mt-1">Unidades totales</p>
          </div>

          <div className="col-span-2 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl p-5 text-center shadow-lg shadow-accent-500/20">
            <p className="text-4xl font-bold text-white">
              {stats?.productosDia || 0}
            </p>
            <p className="text-sm text-accent-100 mt-1">Registros del día</p>
          </div>
        </div>

        {/* By vendor */}
        <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <h2 className="font-semibold text-surface-900">Por Vendedor (del día)</h2>
          </div>
          <div className="p-4">
            {stats?.porVendedor && stats.porVendedor.length > 0 ? (
              <div className="space-y-3">
                {stats.porVendedor
                  .sort((a, b) => b.unidades - a.unidades)
                  .map((v, index) => (
                    <div
                      key={v.vendedor}
                      className="flex items-center gap-3 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-sm font-semibold text-surface-600">
                        {v.vendedor.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-800 truncate">{v.vendedor}</p>
                        <p className="text-xs text-surface-500">{v.registros} registros</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-surface-900">{v.unidades}</p>
                        <p className="text-xs text-surface-500">unidades</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 bg-surface-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-surface-500 text-sm">Sin datos de vendedores</p>
              </div>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <h2 className="font-semibold text-surface-900">Exportar a CSV</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1.5 font-medium">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  max={fechaHasta}
                  className="
                    w-full px-3 py-2.5
                    bg-surface-50 border border-surface-200 rounded-xl
                    text-surface-900 text-sm
                    focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent focus:bg-white
                    transition-all duration-200
                  "
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1.5 font-medium">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  min={fechaDesde}
                  max={formatDateForInput(new Date())}
                  className="
                    w-full px-3 py-2.5
                    bg-surface-50 border border-surface-200 rounded-xl
                    text-surface-900 text-sm
                    focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent focus:bg-white
                    transition-all duration-200
                  "
                />
              </div>
            </div>
            <Button
              onClick={handleExport}
              variant="primary"
              className="w-full"
              disabled={isExporting}
              isLoading={isExporting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar CSV
            </Button>
          </div>
        </div>

        {/* Refresh button */}
        <Button
          onClick={() => fetchStats(fechaSeleccionada)}
          variant="secondary"
          className="w-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar datos
        </Button>
      </div>
    </main>
  );
}
