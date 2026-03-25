'use client';

import { useState, useEffect } from 'react';

interface HistorialEntry {
  id: number;
  entidad: string;
  entidadId: number;
  accion: 'EDITAR' | 'ELIMINAR';
  vendedor: string;
  cambios: any;
  createdAt: string;
}

interface HistorialListProps {
  entidad: 'Movimiento' | 'Producto';
  entidadId: number;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    cantidad: 'Cantidad',
    ubicacionOrigen: 'Origen',
    ubicacionDestino: 'Destino',
    nota: 'Nota',
    codigo: 'Código',
    descripcion: 'Descripción',
    fotoUrl: 'Foto',
  };
  return labels[field] || field;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '(vacío)';
  if (typeof value === 'string' && value.startsWith('http')) return 'imagen';
  return String(value);
}

export function HistorialList({ entidad, entidadId }: HistorialListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<HistorialEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !loaded) {
      setIsLoading(true);
      fetch(`/api/historial?entidad=${entidad}&entidadId=${entidadId}`)
        .then(res => res.json())
        .then(data => {
          setEntries(data.historial || []);
          setLoaded(true);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, loaded, entidad, entidadId]);

  return (
    <div className="border-t border-surface-100 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-semibold text-surface-700 hover:text-surface-900 transition-colors"
      >
        <span>Historial de cambios</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 skeleton rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-3">Sin cambios registrados</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-surface-50 rounded-lg px-3 py-2">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded font-semibold
                    ${entry.accion === 'EDITAR'
                      ? 'bg-transfer-100 text-transfer-700'
                      : 'bg-error-100 text-error-700'
                    }
                  `}>
                    {entry.accion === 'EDITAR' ? 'Editado' : 'Eliminado'}
                  </span>
                  <span className="text-xs text-surface-500">por {entry.vendedor}</span>
                  <span className="text-xs text-surface-400 ml-auto">{formatTimeAgo(entry.createdAt)}</span>
                </div>

                {/* Changes */}
                {entry.accion === 'EDITAR' && entry.cambios && (
                  <div className="space-y-0.5">
                    {Object.entries(entry.cambios).map(([field, change]: [string, any]) => (
                      <p key={field} className="text-xs text-surface-600">
                        <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                        <span className="text-error-500 line-through">{formatValue(change.antes)}</span>
                        {' → '}
                        <span className="text-accent-600 font-medium">{formatValue(change.despues)}</span>
                      </p>
                    ))}
                  </div>
                )}

                {entry.accion === 'ELIMINAR' && entry.cambios && (
                  <p className="text-xs text-surface-500">
                    {entry.cambios.tipo && `${entry.cambios.tipo} `}
                    {entry.cambios.cantidad && `x${entry.cambios.cantidad} `}
                    {entry.cambios.producto?.codigo && `(${entry.cambios.producto.codigo})`}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
