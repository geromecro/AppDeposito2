'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { ProductoCard } from '@/components/ProductoCard';

interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  fotoUrl: string | null;
  vendedor: string;
  createdAt: string;
}

export default function TransferenciasPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState('');
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

  const fetchProductos = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/productos?${params.toString()}`);
      const data = await res.json();
      setProductos(data.productos || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (vendedor) {
      fetchProductos();
    }
  }, [vendedor, fetchProductos]);

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
              codigo={producto.codigo}
              descripcion={producto.descripcion}
              cantidad={producto.cantidad}
              vendedor={producto.vendedor}
              fotoUrl={producto.fotoUrl}
              createdAt={producto.createdAt}
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
    </main>
  );
}
