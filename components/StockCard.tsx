'use client';

import { Card, CardBody } from './Card';

interface StockCardProps {
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    fotoUrl?: string | null;
  };
  stockDeposito: number;
  stockLocal: number;
  total: number;
  onClick?: () => void;
}

export function StockCard({
  producto,
  stockDeposito,
  stockLocal,
  total,
  onClick,
}: StockCardProps) {
  const sinStockDeposito = stockDeposito === 0;
  const sinStockLocal = stockLocal === 0;

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="w-24 h-24 flex-shrink-0 bg-primary-100 flex items-center justify-center">
          {producto.fotoUrl ? (
            <img src={producto.fotoUrl} alt={producto.descripcion} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
        </div>
        <CardBody className="flex-1 py-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary-900 truncate">{producto.codigo}</p>
              <p className="text-sm text-primary-600 line-clamp-1">{producto.descripcion}</p>
            </div>
            <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded ml-2">
              {total}
            </span>
          </div>
          <div className="flex gap-4 mt-2">
            <div className={`text-sm ${sinStockDeposito ? 'text-error-600' : 'text-blue-600'}`}>
              <span className="font-medium">Dep:</span> {stockDeposito}
            </div>
            <div className={`text-sm ${sinStockLocal ? 'text-warning-600' : 'text-accent-600'}`}>
              <span className="font-medium">Local:</span> {stockLocal}
            </div>
          </div>
          {(sinStockDeposito || sinStockLocal) && total > 0 && (
            <div className="mt-1 text-xs text-warning-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Sin stock en {sinStockDeposito ? 'Depósito' : 'Local'}
            </div>
          )}
        </CardBody>
      </div>
    </Card>
  );
}
