'use client';

import { Card, CardBody } from './Card';
import { TIPO_MOVIMIENTO_LABELS, TIPO_MOVIMIENTO_COLORS, TipoMovimiento } from '@/lib/constants';

interface MovimientoCardProps {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  ubicacionOrigen?: string | null;
  ubicacionDestino?: string | null;
  vendedor: string;
  nota?: string | null;
  createdAt: string;
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    fotoUrl?: string | null;
  };
  onClick?: () => void;
}

export function MovimientoCard({
  tipo,
  cantidad,
  ubicacionOrigen,
  ubicacionDestino,
  vendedor,
  nota,
  createdAt,
  producto,
  onClick,
}: MovimientoCardProps) {
  const fecha = new Date(createdAt);
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderUbicaciones = () => {
    if (tipo === 'ENTRADA') {
      return (
        <span className="text-accent-600">
          +{cantidad} → {ubicacionDestino}
        </span>
      );
    }
    if (tipo === 'TRASLADO') {
      return (
        <span className="text-blue-600">
          {ubicacionOrigen} → {ubicacionDestino} ({cantidad})
        </span>
      );
    }
    if (tipo === 'SALIDA') {
      return (
        <span className="text-warning-600">
          -{cantidad} ← {ubicacionOrigen}
        </span>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="w-16 h-16 flex-shrink-0 bg-primary-100 flex items-center justify-center">
          {producto.fotoUrl ? (
            <img src={producto.fotoUrl} alt={producto.descripcion} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
        </div>
        <CardBody className="flex-1 py-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_MOVIMIENTO_COLORS[tipo]}`}>
                  {TIPO_MOVIMIENTO_LABELS[tipo]}
                </span>
                <span className="text-xs text-primary-500">{fechaFormateada}</span>
              </div>
              <p className="font-semibold text-primary-900 truncate mt-1">{producto.codigo}</p>
            </div>
          </div>
          <div className="text-sm mt-1">
            {renderUbicaciones()}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-primary-500">
            <span>{vendedor}</span>
            {nota && <span className="truncate ml-2 italic">"{nota}"</span>}
          </div>
        </CardBody>
      </div>
    </Card>
  );
}
