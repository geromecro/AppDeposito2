'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VENDEDORES } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const vendedor = localStorage.getItem('vendedor');
    if (vendedor) {
      router.push('/inventario');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleSubmit = () => {
    if (selectedVendedor) {
      localStorage.setItem('vendedor', selectedVendedor);
      router.push('/inventario');
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-surface-700 border-t-accent-500 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-surface-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Logo area */}
        <div className="mb-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-lg shadow-accent-500/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            App Depósito
          </h1>
          <p className="text-surface-400 mt-2 text-sm">
            Gestión de inventario
          </p>
        </div>

        {/* Vendor selection */}
        <div className="w-full max-w-sm">
          <p className="text-surface-400 text-sm mb-4 text-center">
            Selecciona tu usuario
          </p>

          <div className="grid grid-cols-2 gap-3">
            {VENDEDORES.map((vendedor, index) => (
              <button
                key={vendedor}
                onClick={() => setSelectedVendedor(vendedor)}
                className={`
                  relative p-4 rounded-xl text-left transition-all duration-200
                  ${selectedVendedor === vendedor
                    ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/30 scale-[1.02]'
                    : 'bg-surface-800/50 text-surface-200 hover:bg-surface-800 border border-surface-700/50'
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    ${selectedVendedor === vendedor
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-700 text-surface-300'
                    }
                  `}>
                    {vendedor.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{vendedor}</span>
                </div>

                {selectedVendedor === vendedor && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div className="p-6 relative z-10">
        <button
          onClick={handleSubmit}
          disabled={!selectedVendedor}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 press-effect
            ${selectedVendedor
              ? 'bg-white text-surface-900 shadow-lg hover:shadow-xl'
              : 'bg-surface-800 text-surface-500 cursor-not-allowed'
            }
          `}
        >
          {selectedVendedor ? `Continuar como ${selectedVendedor}` : 'Selecciona tu usuario'}
        </button>
      </div>
    </main>
  );
}
