'use client';

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
  const sinStockTotal = total === 0;

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
        <div className="w-24 h-24 flex-shrink-0 bg-surface-100 relative overflow-hidden">
          {producto.fotoUrl ? (
            <img
              src={producto.fotoUrl}
              alt={producto.descripcion}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          {/* Code and description */}
          <div className="mb-2">
            <p className="font-code font-semibold text-surface-900 truncate text-base">
              {producto.codigo}
            </p>
            <p className="text-sm text-surface-500 line-clamp-1">
              {producto.descripcion}
            </p>
          </div>

          {/* Stock badges */}
          <div className="flex items-center gap-2">
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium
              ${sinStockDeposito
                ? 'bg-error-50 text-error-600'
                : 'bg-transfer-50 text-transfer-700'
              }
            `}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{stockDeposito}</span>
            </div>

            <div className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium
              ${sinStockLocal
                ? 'bg-warning-50 text-warning-600'
                : 'bg-accent-50 text-accent-700'
              }
            `}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>{stockLocal}</span>
            </div>

            {sinStockTotal && (
              <span className="ml-auto text-xs text-error-500 font-medium">
                Sin stock
              </span>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        {onClick && (
          <div className="flex items-center pr-3">
            <svg className="w-5 h-5 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
