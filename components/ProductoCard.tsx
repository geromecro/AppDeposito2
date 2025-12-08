'use client';

import { Card, CardBody } from './Card';

interface ProductoCardProps {
  id: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  vendedor: string;
  fotoUrl?: string | null;
  createdAt: string;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function ProductoCard({
  id,
  codigo,
  descripcion,
  cantidad,
  vendedor,
  fotoUrl,
  createdAt,
  onView,
  onEdit,
  onDelete,
}: ProductoCardProps) {
  const fecha = new Date(createdAt);
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex ${onView ? 'cursor-pointer' : ''}`}
        onClick={() => onView?.(id)}
      >
        {/* Foto o placeholder */}
        <div className="w-24 h-24 flex-shrink-0 bg-primary-100 flex items-center justify-center">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={descripcion}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-8 h-8 text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        {/* Info */}
        <CardBody className="flex-1 py-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-primary-900">{codigo}</p>
              <p className="text-sm text-primary-600 line-clamp-2">{descripcion}</p>
            </div>
            <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded">
              x{cantidad}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-primary-500">
            <span>{vendedor}</span>
            <span>{fechaFormateada}</span>
          </div>
          {/* Botones de acción */}
          {(onEdit || onDelete) && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-primary-100">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(id); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-error-600 hover:bg-error-50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              )}
            </div>
          )}
        </CardBody>
      </div>
    </Card>
  );
}
