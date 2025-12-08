'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';

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

// Formato YYYY-MM-DD para input date
const formatDateForInput = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function ResumenPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(formatDateForInput(new Date()));

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

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-primary-500">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-primary-200 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/transferencias" className="text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-primary-900">Resumen</h1>
        </div>
        {/* Selector de fecha */}
        <div className="px-4 pb-3">
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            max={formatDateForInput(new Date())}
            className="w-full px-3 py-2 border border-primary-300 rounded-lg text-primary-900 bg-white"
          />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats generales */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-primary-900">
                {stats?.totalProductos || 0}
              </p>
              <p className="text-sm text-primary-500">Registros totales</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-primary-900">
                {stats?.totalUnidades || 0}
              </p>
              <p className="text-sm text-primary-500">Unidades totales</p>
            </CardBody>
          </Card>

          <Card className="col-span-2">
            <CardBody className="text-center">
              <p className="text-3xl font-bold text-accent-600">
                {stats?.productosDia || 0}
              </p>
              <p className="text-sm text-primary-500">Registros del día</p>
            </CardBody>
          </Card>
        </div>

        {/* Por vendedor */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-primary-900">Por Vendedor (del día)</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {stats?.porVendedor && stats.porVendedor.length > 0 ? (
              stats.porVendedor
                .sort((a, b) => b.unidades - a.unidades)
                .map((v) => (
                  <div
                    key={v.vendedor}
                    className="flex items-center justify-between py-2 border-b border-primary-100 last:border-0"
                  >
                    <span className="font-medium text-primary-800">{v.vendedor}</span>
                    <div className="text-right">
                      <span className="text-primary-900 font-semibold">{v.unidades}</span>
                      <span className="text-primary-500 text-sm ml-1">unidades</span>
                      <span className="text-primary-400 text-sm ml-2">({v.registros} reg.)</span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-primary-500 text-center py-4">
                No hay datos de vendedores
              </p>
            )}
          </CardBody>
        </Card>

        {/* Boton actualizar */}
        <Button onClick={() => fetchStats(fechaSeleccionada)} variant="secondary" className="w-full">
          Actualizar datos
        </Button>
      </div>
    </main>
  );
}
