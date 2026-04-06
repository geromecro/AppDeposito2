'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { useToast } from '@/components/Toast';
import { fetchClientSession } from '@/lib/client-session';

type ResultadoAcceso = 'EXITOSO' | 'FALLIDO';

interface AccesoLogin {
  id: number;
  usuario: string;
  ip: string | null;
  userAgent: string | null;
  resultado: ResultadoAcceso;
  ubicacionAprox: string | null;
  createdAt: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const RESULTADO_LABELS: Record<ResultadoAcceso, string> = {
  EXITOSO: 'Exitoso',
  FALLIDO: 'Fallido',
};

export default function AuditoriaPage() {
  const router = useRouter();
  const { error: showErrorToast } = useToast();
  const [vendedor, setVendedor] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [resultado, setResultado] = useState<'TODOS' | ResultadoAcceso>('TODOS');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [accesos, setAccesos] = useState<AccesoLogin[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let active = true;

    fetchClientSession()
      .then((session) => {
        if (!active) return;

        if (!session.authenticated || !session.vendedor) {
          router.replace('/');
          return;
        }

        setVendedor(session.vendedor);
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) {
          router.replace('/');
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, resultado]);

  useEffect(() => {
    if (!vendedor) return;

    let cancelled = false;

    const fetchAccesos = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const params = new URLSearchParams({
          page: String(page),
          limit: '25',
        });

        if (deferredSearch.trim()) {
          params.set('usuario', deferredSearch.trim());
        }

        if (resultado !== 'TODOS') {
          params.set('resultado', resultado);
        }

        const res = await fetch(`/api/accesos-login?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const message =
            typeof data?.error === 'string' ? data.error : 'No se pudo cargar la auditoria';
          if (!cancelled) {
            setAccesos([]);
            setPagination({
              page: 1,
              limit: 25,
              total: 0,
              totalPages: 1,
            });
            setLoadError(message);
            showErrorToast(message);
          }
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setAccesos(data.accesos || []);
          setPagination(
            data.pagination || {
              page: 1,
              limit: 25,
              total: 0,
              totalPages: 1,
            }
          );
        }
      } catch (error) {
        console.error('Error fetching access log:', error);
        if (!cancelled) {
          setLoadError('No se pudo cargar la auditoria');
          showErrorToast('No se pudo cargar la auditoria');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAccesos();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, page, reloadToken, resultado, showErrorToast, vendedor]);

  if (checkingSession || !vendedor) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-100">
        <div className="w-8 h-8 border-2 border-surface-300 border-t-surface-900 rounded-full animate-spin" />
      </main>
    );
  }

  const exitosos = accesos.filter((item) => item.resultado === 'EXITOSO').length;
  const fallidos = accesos.length - exitosos;

  return (
    <main className="min-h-screen bg-surface-100 pb-10">
      <header className="sticky top-0 glass border-b border-surface-200 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-surface-900">Auditoria</h1>
              <p className="text-sm text-surface-500">Accesos registrados al iniciar sesion</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/inventario">
                <Button variant="ghost" size="sm">
                  Volver
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReloadToken((current) => current + 1)}
                disabled={isLoading}
                title="Actualizar auditoria"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
          </div>

          <SearchBar
            value={search}
            onChange={setSearch}
            label="Buscar accesos por usuario"
            placeholder="Buscar por usuario..."
          />

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={() => setResultado('TODOS')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                resultado === 'TODOS'
                  ? 'bg-surface-900 text-white'
                  : 'bg-white text-surface-600 border border-surface-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setResultado('EXITOSO')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                resultado === 'EXITOSO'
                  ? 'bg-accent-500 text-white'
                  : 'bg-white text-surface-600 border border-surface-200'
              }`}
            >
              Exitosos
            </button>
            <button
              type="button"
              onClick={() => setResultado('FALLIDO')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                resultado === 'FALLIDO'
                  ? 'bg-error-500 text-white'
                  : 'bg-white text-surface-600 border border-surface-200'
              }`}
            >
              Fallidos
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-surface-200 p-4">
            <p className="text-xs uppercase tracking-wide text-surface-400">Total</p>
            <p className="mt-1 text-2xl font-bold text-surface-900">{pagination.total}</p>
          </div>
          <div className="rounded-2xl bg-white border border-accent-100 p-4">
            <p className="text-xs uppercase tracking-wide text-accent-600">Exitosos pag.</p>
            <p className="mt-1 text-2xl font-bold text-accent-700">{exitosos}</p>
          </div>
          <div className="rounded-2xl bg-white border border-error-100 p-4">
            <p className="text-xs uppercase tracking-wide text-error-600">Fallidos pag.</p>
            <p className="mt-1 text-2xl font-bold text-error-700">{fallidos}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-white border border-surface-200 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl bg-white border border-error-200 p-8 text-center">
            <p className="font-medium text-error-700">{loadError}</p>
            <p className="mt-1 text-sm text-surface-500">Actualiza la pagina en unos segundos.</p>
          </div>
        ) : accesos.length === 0 ? (
          <div className="rounded-2xl bg-white border border-surface-200 p-8 text-center">
            <p className="font-medium text-surface-700">No hay accesos para esos filtros</p>
            <p className="mt-1 text-sm text-surface-500">Probá cambiar el usuario o el resultado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accesos.map((acceso) => (
              <article key={acceso.id} className="rounded-2xl bg-white border border-surface-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-surface-900">{acceso.usuario}</h2>
                    <p className="text-sm text-surface-500">
                      {new Date(acceso.createdAt).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      acceso.resultado === 'EXITOSO'
                        ? 'bg-accent-50 text-accent-700'
                        : 'bg-error-50 text-error-700'
                    }`}
                  >
                    {RESULTADO_LABELS[acceso.resultado]}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-surface-400">IP</dt>
                    <dd className="mt-1 text-sm text-surface-700">{acceso.ip || 'No disponible'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-surface-400">Ubicacion aprox.</dt>
                    <dd className="mt-1 text-sm text-surface-700">{acceso.ubicacionAprox || 'No disponible'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-surface-400">User agent</dt>
                    <dd className="mt-1 break-words text-sm text-surface-700">{acceso.userAgent || 'No disponible'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-white border border-surface-200 p-4">
          <div>
            <p className="text-sm font-medium text-surface-700">
              Pagina {pagination.page} de {pagination.totalPages}
            </p>
            <p className="text-xs text-surface-500">Mostrando {accesos.length} registros de la pagina actual</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={pagination.page <= 1 || isLoading}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
