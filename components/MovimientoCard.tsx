'use client';

import { TIPO_MOVIMIENTO_LABELS, TipoMovimiento } from '@/lib/constants';

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
  onEdit?: () => void;
  onDelete?: () => void;
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
  onEdit,
  onDelete,
}: MovimientoCardProps) {
  const fecha = new Date(createdAt);
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tipoStyles = {
    ENTRADA: {
      badge: 'bg-accent-100 text-accent-700 border border-accent-200',
      icon: '+',
      accent: 'text-accent-600',
    },
    TRASLADO: {
      badge: 'bg-transfer-100 text-transfer-700 border border-transfer-200',
      icon: '↔',
      accent: 'text-transfer-600',
    },
    SALIDA: {
      badge: 'bg-warning-100 text-warning-700 border border-warning-200',
      icon: '-',
      accent: 'text-warning-600',
    },
  };

  const style = tipoStyles[tipo];

  const renderUbicaciones = () => {
    if (tipo === 'ENTRADA') {
      return (
        <span className={style.accent}>
          +{cantidad} → {ubicacionDestino}
        </span>
      );
    }
    if (tipo === 'TRASLADO') {
      return (
        <span className={style.accent}>
          {ubicacionOrigen} → {ubicacionDestino} ({cantidad})
        </span>
      );
    }
    if (tipo === 'SALIDA') {
      return (
        <span className={style.accent}>
          -{cantidad} ← {ubicacionOrigen}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={`
        bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-surface-300 active:scale-[0.99]' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="w-16 h-auto min-h-[80px] flex-shrink-0 bg-surface-100 flex items-center justify-center">
          {producto.fotoUrl ? (
            <img src={producto.fotoUrl} alt={producto.descripcion} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <svg className="w-6 h-6 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${style.badge}`}>
              {TIPO_MOVIMIENTO_LABELS[tipo]}
            </span>
            <span className="text-xs text-surface-400">{fechaFormateada}</span>
          </div>

          {/* Product code */}
          <p className="font-code font-semibold text-surface-900 truncate">{producto.codigo}</p>

          {/* Movement info */}
          <div className="text-sm mt-1 font-medium">
            {renderUbicaciones()}
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between mt-1.5 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {vendedor}
            </span>
            {nota && (
              <span className="truncate ml-2 italic text-surface-400 max-w-[120px]">
                "{nota}"
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        {onClick && !onEdit && !onDelete && (
          <div className="flex items-center pr-3">
            <svg className="w-5 h-5 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 border-t border-surface-100 px-3 py-1.5">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-500 hover:text-transfer-600 hover:bg-transfer-50 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-500 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
