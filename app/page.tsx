'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { VENDEDORES } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');

  useEffect(() => {
    // Si ya hay un vendedor guardado, ir directo a transferencias
    const vendedor = localStorage.getItem('vendedor');
    if (vendedor) {
      router.push('/transferencias');
    }
  }, [router]);

  const handleSubmit = () => {
    if (selectedVendedor) {
      localStorage.setItem('vendedor', selectedVendedor);
      router.push('/transferencias');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary-900">
              Control de Traslado
            </h1>
            <p className="text-primary-600 mt-1">
              Selecciona tu nombre para continuar
            </p>
          </div>

          <div className="space-y-3">
            {VENDEDORES.map((vendedor) => (
              <button
                key={vendedor}
                onClick={() => setSelectedVendedor(vendedor)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedVendedor === vendedor
                    ? 'border-primary-800 bg-primary-50'
                    : 'border-primary-200 hover:border-primary-400'
                }`}
              >
                <span className="font-medium text-primary-900">{vendedor}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedVendedor}
            className="w-full"
            size="lg"
          >
            Continuar
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
