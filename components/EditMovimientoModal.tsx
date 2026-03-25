'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { UBICACIONES } from '@/lib/constants';
import type { TipoMovimiento } from '@/lib/constants';
import { TIPO_MOVIMIENTO_LABELS } from '@/lib/constants';

interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  ubicacionOrigen: string | null;
  ubicacionDestino: string | null;
  vendedor: string;
  nota: string | null;
  createdAt: string;
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    fotoUrl: string | null;
  };
}

interface EditMovimientoModalProps {
  movimiento: Movimiento;
  onClose: () => void;
  onSaved: () => void;
}

export function EditMovimientoModal({ movimiento, onClose, onSaved }: EditMovimientoModalProps) {
  const [cantidad, setCantidad] = useState(movimiento.cantidad);
  const [ubicacionOrigen, setUbicacionOrigen] = useState(movimiento.ubicacionOrigen || '');
  const [ubicacionDestino, setUbicacionDestino] = useState(movimiento.ubicacionDestino || '');
  const [nota, setNota] = useState(movimiento.nota || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockInfo, setStockInfo] = useState<Record<string, number>>({});

  // Fetch stock info for reference
  useEffect(() => {
    fetch(`/api/stock?search=${encodeURIComponent(movimiento.producto.codigo)}`)
      .then(res => res.json())
      .then(data => {
        const item = data.stock?.find((s: any) => s.producto.id === movimiento.producto.id);
        if (item) {
          setStockInfo({ Deposito: item.stockDeposito, Local: item.stockLocal });
        }
      })
      .catch(() => {});
  }, [movimiento.producto.id, movimiento.producto.codigo]);

  const handleSave = async () => {
    setError('');
    if (cantidad < 1) {
      setError('La cantidad debe ser al menos 1');
      return;
    }

    const vendedor = localStorage.getItem('vendedor');
    if (!vendedor) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/movimientos/${movimiento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad,
          ubicacionOrigen: ubicacionOrigen || null,
          ubicacionDestino: ubicacionDestino || null,
          nota: nota || null,
          vendedor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al editar movimiento');
        return;
      }

      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const tipoStyles: Record<string, string> = {
    ENTRADA: 'bg-accent-100 text-accent-700 border-accent-200',
    TRASLADO: 'bg-transfer-100 text-transfer-700 border-transfer-200',
    SALIDA: 'bg-warning-100 text-warning-700 border-warning-200',
  };

  const showOrigen = movimiento.tipo === 'TRASLADO' || movimiento.tipo === 'SALIDA';
  const showDestino = movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'TRASLADO';

  return (
    <div
      className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>

        <div className="p-5">
          <h2 className="text-lg font-bold text-surface-900 mb-4">Editar movimiento</h2>

          {/* Read-only info */}
          <div className="bg-surface-50 rounded-xl p-3 mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${tipoStyles[movimiento.tipo]}`}>
                {TIPO_MOVIMIENTO_LABELS[movimiento.tipo]}
              </span>
              <span className="text-xs text-surface-400">
                {new Date(movimiento.createdAt).toLocaleDateString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <p className="font-code font-semibold text-surface-900">{movimiento.producto.codigo}</p>
            <p className="text-sm text-surface-600">{movimiento.producto.descripcion}</p>
            <p className="text-xs text-surface-400">Registrado por: {movimiento.vendedor}</p>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 text-sm bg-white border border-surface-200 rounded-xl text-surface-900 focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent transition-all duration-200"
              />
              {showOrigen && stockInfo[ubicacionOrigen] !== undefined && (
                <p className="text-xs text-surface-400 mt-1">
                  Stock actual en {ubicacionOrigen}: {stockInfo[ubicacionOrigen]}
                </p>
              )}
            </div>

            {/* Ubicación Origen */}
            {showOrigen && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Ubicación origen</label>
                <select
                  value={ubicacionOrigen}
                  onChange={(e) => setUbicacionOrigen(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-white border border-surface-200 rounded-xl text-surface-900 focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent transition-all duration-200"
                >
                  {UBICACIONES.map((ubi) => (
                    <option key={ubi} value={ubi}>{ubi}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Ubicación Destino */}
            {showDestino && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Ubicación destino</label>
                <select
                  value={ubicacionDestino}
                  onChange={(e) => setUbicacionDestino(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-white border border-surface-200 rounded-xl text-surface-900 focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent transition-all duration-200"
                >
                  {UBICACIONES.map((ubi) => (
                    <option key={ubi} value={ubi}>{ubi}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Nota */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Nota (opcional)</label>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Agregar nota..."
                className="w-full px-4 py-3 text-sm bg-white border border-surface-200 rounded-xl text-surface-900 focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-xl">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSave} isLoading={isLoading}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
