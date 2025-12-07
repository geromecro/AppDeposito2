'use client';

import { Card, CardBody } from './Card';

interface ProductoCardProps {
  codigo: string;
  descripcion: string;
  cantidad: number;
  vendedor: string;
  fotoUrl?: string | null;
  createdAt: string;
}

export function ProductoCard({
  codigo,
  descripcion,
  cantidad,
  vendedor,
  fotoUrl,
  createdAt,
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
      <div className="flex">
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
        </CardBody>
      </div>
    </Card>
  );
}
