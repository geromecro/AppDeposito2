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
        </CardBody>
      </div>
    </Card>
  );
}
