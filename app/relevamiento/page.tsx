'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import {
  CLASIFICACION_RELEVAMIENTO_LABELS,
  CLASIFICACIONES_RELEVAMIENTO,
  ESTADO_RELEVAMIENTO_LABELS,
  EstadoRelevamiento,
  ClasificacionRelevamiento,
} from '@/lib/constants';
import { fetchClientSession } from '@/lib/client-session';

interface RelevamientoItem {
  id: number;
  codigo: string | null;
  codigoProvisorio: string;
  descripcion: string;
  fotoUrl: string | null;
  ubicacionFisica: string;
  clasificacion: ClasificacionRelevamiento;
  estado: EstadoRelevamiento;
  observacion: string | null;
  relevadoPor: string;
  relevadoAt: string;
}

interface ProductoDuplicado {
  id: number;
  codigo: string;
  descripcion: string;
  fotoUrl: string | null;
  stockDeposito?: number;
  stockLocal?: number;
}

const ESTADO_STYLES: Record<EstadoRelevamiento, string> = {
  RELEVADO: 'bg-accent-50 text-accent-700 border border-accent-200',
  PENDIENTE_REVISION: 'bg-surface-100 text-surface-700 border border-surface-200',
  PENDIENTE_STOCK: 'bg-transfer-50 text-transfer-700 border border-transfer-200',
  DUPLICADO_POTENCIAL: 'bg-warning-50 text-warning-700 border border-warning-200',
  DESCARTADO: 'bg-error-50 text-error-700 border border-error-200',
};

export default function RelevamientoPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendedor, setVendedor] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacionFisica, setUbicacionFisica] = useState('Deposito');
  const [clasificacion, setClasificacion] = useState<ClasificacionRelevamiento>('PARA_REVISAR');
  const [observacion, setObservacion] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relevamientosRecientes, setRelevamientosRecientes] = useState<RelevamientoItem[]>([]);
  const [duplicadosCatalogo, setDuplicadosCatalogo] = useState<ProductoDuplicado[]>([]);

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

  const fetchRecientes = async () => {
    try {
      setIsLoadingRecent(true);
      const res = await fetch('/api/relevamiento?limit=12');
      if (!res.ok) {
        throw new Error('No se pudieron cargar los relevamientos');
      }

      const data = await res.json();
      setRelevamientosRecientes(data.relevamientos || []);
    } catch (fetchError) {
      console.error('Error fetching relevamientos:', fetchError);
      toast.error('No se pudieron cargar los relevamientos recientes');
    } finally {
      setIsLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (vendedor) {
      void fetchRecientes();
    }
  }, [vendedor]);

  const busquedaDuplicados = useMemo(
    () => `${codigo} ${descripcion}`.trim(),
    [codigo, descripcion]
  );

  useEffect(() => {
    if (busquedaDuplicados.length < 2) {
      setDuplicadosCatalogo([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos-catalogo?search=${encodeURIComponent(busquedaDuplicados)}&limit=6`);
        if (!res.ok) {
          throw new Error('No se pudieron revisar duplicados');
        }

        const data = await res.json();
        setDuplicadosCatalogo(data.productos || []);
      } catch (fetchError) {
        console.error('Error searching duplicates:', fetchError);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busquedaDuplicados]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setFotoPreview(loadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const compressionOptions = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      const formData = new FormData();
      formData.append('file', compressedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await res.json();
      setFotoUrl(data.url);
    } catch (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('No se pudo subir la foto');
      setFotoPreview(null);
      setFotoUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFoto = () => {
    setFotoUrl(null);
    setFotoPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetFormForNext = () => {
    setCodigo('');
    setDescripcion('');
    setObservacion('');
    setFotoUrl(null);
    setFotoPreview(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!descripcion.trim() && !fotoUrl) {
      setError('Completa una descripcion o carga una foto');
      return;
    }

    if (!ubicacionFisica.trim()) {
      setError('La ubicacion fisica es obligatoria');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/relevamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          ubicacionFisica: ubicacionFisica.trim(),
          clasificacion,
          observacion: observacion.trim(),
          fotoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el relevamiento');
      }

      if (data.duplicateCatalogProduct) {
        toast.error(`Ojo: ya existe ${data.duplicateCatalogProduct.codigo} en el catalogo`);
      } else {
        toast.success('Producto relevado');
      }

      resetFormForNext();
      await fetchRecientes();
    } catch (submitError: any) {
      console.error('Error creating relevamiento:', submitError);
      setError(submitError.message || 'No se pudo guardar el relevamiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vendedor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface-100 pb-8">
      <header className="sticky top-0 glass border-b border-surface-200 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/inventario" aria-label="Volver al inventario">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-200 rounded-xl transition-colors">
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-surface-900">Relevamiento</h1>
            <p className="text-sm text-surface-500">Alta rapida de mercaderia</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-surface-900">Carga rapida</h2>
                <p className="mt-1 text-sm text-surface-500">
                  Identifica, clasifica y pasa al siguiente producto sin entrar todavia a stock operativo.
                </p>
              </div>
              <Link href="/resumen" className="text-sm font-medium text-transfer-700 hover:text-transfer-800">
                Actividad
              </Link>
            </div>

            {error && (
              <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="mb-2 text-sm font-medium text-surface-700">Foto</p>
                {fotoPreview ? (
                  <div className="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-50">
                    <img src={fotoPreview} alt="Vista previa del relevamiento" className="h-52 w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeFoto}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-surface-700 shadow-sm"
                      aria-label="Quitar foto"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-surface-50 px-4 py-8 text-surface-600 transition-colors hover:border-surface-400 hover:bg-surface-100"
                  >
                    <svg className="mb-2 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {isUploading ? 'Subiendo foto...' : 'Tomar o subir foto'}
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Codigo visible"
                  placeholder="Si tiene codigo, escribelo"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                />
                <Input
                  label="Ubicacion fisica"
                  placeholder="Ej. Deposito fondo, Estante 4"
                  value={ubicacionFisica}
                  onChange={(event) => setUbicacionFisica(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-700">Descripcion breve</label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={3}
                  placeholder="Ej. Caja de bisagras antiguas, juego de manijas, repuesto plastico..."
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-surface-700">Clasificacion</p>
                <div className="grid grid-cols-2 gap-2">
                  {CLASIFICACIONES_RELEVAMIENTO.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setClasificacion(item)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        clasificacion === item
                          ? 'border-surface-900 bg-surface-900 text-white'
                          : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300'
                      }`}
                    >
                      {CLASIFICACION_RELEVAMIENTO_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-700">Observacion corta</label>
                <textarea
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  rows={2}
                  placeholder="Dato util para revisar despues"
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="accent" className="flex-1" isLoading={isSubmitting}>
                  Guardar y siguiente
                </Button>
                <Button type="button" variant="secondary" onClick={resetFormForNext}>
                  Limpiar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {duplicadosCatalogo.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-surface-900">Posibles duplicados en catalogo</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {duplicadosCatalogo.map((producto) => (
                <div key={producto.id} className="flex items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-white">
                    {producto.fotoUrl ? (
                      <img src={producto.fotoUrl} alt={producto.descripcion} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-surface-300">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-code text-sm font-semibold text-surface-900">{producto.codigo}</p>
                    <p className="truncate text-sm text-surface-600">{producto.descripcion}</p>
                  </div>
                  <Link href={`/movimientos/nuevo?productoId=${producto.id}&tipo=ENTRADA`} className="text-sm font-medium text-warning-800">
                    Usar existente
                  </Link>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-surface-900">Relevados recientes</h2>
                <p className="text-sm text-surface-500">Ultimos productos cargados para continuar la revision.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void fetchRecientes()}>
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {isLoadingRecent ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-24 rounded-2xl bg-surface-100 skeleton" />
                ))}
              </div>
            ) : relevamientosRecientes.length === 0 ? (
              <div className="rounded-2xl bg-surface-50 px-4 py-8 text-center text-sm text-surface-500">
                Todavia no hay productos relevados en este modulo.
              </div>
            ) : (
              relevamientosRecientes.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-white">
                    {item.fotoUrl ? (
                      <img src={item.fotoUrl} alt={item.descripcion} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-surface-300">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-code text-sm font-semibold text-surface-900">
                        {item.codigo || item.codigoProvisorio}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[item.estado]}`}>
                        {ESTADO_RELEVAMIENTO_LABELS[item.estado]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-surface-700">{item.descripcion}</p>
                    <p className="mt-1 text-xs text-surface-500">
                      {CLASIFICACION_RELEVAMIENTO_LABELS[item.clasificacion]} · {item.ubicacionFisica} · {item.relevadoPor}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
