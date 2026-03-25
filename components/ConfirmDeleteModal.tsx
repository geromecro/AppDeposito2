'use client';

import { Button } from '@/components/Button';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({ title, message, detail, onConfirm, onCancel, isLoading }: ConfirmDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* Warning icon */}
          <div className="w-14 h-14 mx-auto mb-4 bg-error-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-surface-900 mb-2">{title}</h3>
          <p className="text-sm text-surface-600 mb-1">{message}</p>
          {detail && (
            <p className="text-xs text-surface-400 bg-surface-50 rounded-lg px-3 py-2 mt-3 font-code">{detail}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
