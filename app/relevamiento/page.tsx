'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import {
  CLASIFICACION_RELEVAMIENTO_LABELS,
  CLASIFICACIONES_RELEVAMIENTO,
  ESTADO_RELEVAMIENTO_LABELS,
  ESTADOS_RELEVAMIENTO,
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
  updatedAt: string;
}

interface ProductoDuplicado {
  id: number;
  codigo: string;
  descripcion: string;
  fotoUrl: string | null;
}

const ESTADO_STYLES: Record<EstadoRelevamiento, string> = {
  RELEVADO: 'bg-accent-50 text-accent-700 border border-accent-200',
  PENDIENTE_REVISION: 'bg-surface-100 text-surface-700 border border-surface-200',
  PENDIENTE_STOCK: 'bg-transfer-50 text-transfer-700 border border-transfer-200',
  DUPLICADO_POTENCIAL: 'bg-warning-50 text-warning-700 border border-warning-200',
  DESCARTADO: 'bg-error-50 text-error-700 border border-error-200',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function uploadCompressedImage(file: File) {
  const preview = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

  const compressedFile = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

  const formData = new FormData();
  formData.append('file', compressedFile);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('No se pudo subir la foto');
  }

  const data = await res.json();
  return {
    preview,
    url: data.url as string,
  };
}

export default function RelevamientoPage() {
  const router = useRouter();
  const toast = useToast();
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  const [vendedor, setVendedor] = useState<string | null>(null);

  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacionFisica, setUbicacionFisica] = useState('Deposito');
  const [clasificacion, setClasificacion] =
    useState<ClasificacionRelevamiento>('PARA_REVISAR');
  const [observacion, setObservacion] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isUploadingCreate, setIsUploadingCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchListado, setSearchListado] = useState('');
  const [debouncedSearchListado, setDebouncedSearchListado] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRelevamiento | ''>('');
  const [isLoadingListado, setIsLoadingListado] = useState(true);
  const [relevamientos, setRelevamientos] = useState<RelevamientoItem[]>([]);

  const [duplicadosCatalogo, setDuplicadosCatalogo] = useState<
    ProductoDuplicado[]
  >([]);

  const [selectedRelevamiento, setSelectedRelevamiento] =
    useState<RelevamientoItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isUploadingDetail, setIsUploadingDetail] = useState(false);
  const [deletingRelevamiento, setDeletingRelevamiento] =
    useState<RelevamientoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [detailCodigo, setDetailCodigo] = useState('');
  const [detailDescripcion, setDetailDescripcion] = useState('');
  const [detailUbicacionFisica, setDetailUbicacionFisica] = useState('');
  const [detailClasificacion, setDetailClasificacion] =
    useState<ClasificacionRelevamiento>('PARA_REVISAR');
  const [detailEstado, setDetailEstado] =
    useState<EstadoRelevamiento>('PENDIENTE_REVISION');
  const [detailObservacion, setDetailObservacion] = useState('');
  const [detailFotoUrl, setDetailFotoUrl] = useState<string | null>(null);
  const [detailFotoPreview, setDetailFotoPreview] = useState<string | null>(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchListado(searchListado.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchListado]);

  const fetchRelevamientos = useCallback(async () => {
    try {
      setIsLoadingListado(true);
      const params = new URLSearchParams();

      if (debouncedSearchListado) {
        params.set('search', debouncedSearchListado);
      }

      if (estadoFiltro) {
        params.set('estado', estadoFiltro);
      }

      params.set('limit', '50');

      const res = await fetch(`/api/relevamiento?${params.toString()}`);
      if (!res.ok) {
        throw new Error('No se pudieron cargar los relevamientos');
      }

      const data = await res.json();
      setRelevamientos(data.relevamientos || []);
    } catch (fetchError) {
      console.error('Error fetching relevamientos:', fetchError);
      toast.error('No se pudieron cargar los relevamientos');
    } finally {
      setIsLoadingListado(false);
    }
  }, [debouncedSearchListado, estadoFiltro, toast]);

  useEffect(() => {
    if (vendedor) {
      void fetchRelevamientos();
    }
  }, [vendedor, fetchRelevamientos]);

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
        const res = await fetch(
          `/api/productos-catalogo?search=${encodeURIComponent(busquedaDuplicados)}&limit=6`
        );
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

  const resetCreateForm = () => {
    setCodigo('');
    setDescripcion('');
    setObservacion('');
    setFotoUrl(null);
    setFotoPreview(null);
    setError(null);

    if (createFileInputRef.current) {
      createFileInputRef.current.value = '';
    }
  };

  const applyDetailState = (item: RelevamientoItem) => {
    setSelectedRelevamiento(item);
    setDetailCodigo(item.codigo || '');
    setDetailDescripcion(item.descripcion);
    setDetailUbicacionFisica(item.ubicacionFisica);
    setDetailClasificacion(item.clasificacion);
    setDetailEstado(item.estado);
    setDetailObservacion(item.observacion || '');
    setDetailFotoUrl(item.fotoUrl);
    setDetailFotoPreview(item.fotoUrl);
    setDetailError(null);
    setIsEditingDetail(false);

    if (detailFileInputRef.current) {
      detailFileInputRef.current.value = '';
    }
  };

  const fetchDetail = async (id: number) => {
    try {
      setIsLoadingDetail(true);
      setDetailError(null);

      const res = await fetch(`/api/relevamiento/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo abrir el relevamiento');
      }

      applyDetailState(data.relevamiento);
    } catch (fetchError: any) {
      console.error('Error fetching relevamiento detail:', fetchError);
      setDetailError(fetchError.message || 'No se pudo abrir el relevamiento');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCreate(true);
    try {
      const uploaded = await uploadCompressedImage(file);
      setFotoPreview(uploaded.preview);
      setFotoUrl(uploaded.url);
    } catch (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('No se pudo subir la foto');
      setFotoPreview(null);
      setFotoUrl(null);
    } finally {
      setIsUploadingCreate(false);
    }
  };

  const handleDetailFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDetail(true);
    try {
      const uploaded = await uploadCompressedImage(file);
      setDetailFotoPreview(uploaded.preview);
      setDetailFotoUrl(uploaded.url);
    } catch (uploadError) {
      console.error('Error uploading detail image:', uploadError);
      toast.error('No se pudo subir la foto');
    } finally {
      setIsUploadingDetail(false);
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
        toast.error(
          `Ojo: ya existe ${data.duplicateCatalogProduct.codigo} en el catalogo`
        );
      } else {
        toast.success('Producto relevado');
      }

      resetCreateForm();
      await fetchRelevamientos();
    } catch (submitError: any) {
      console.error('Error creating relevamiento:', submitError);
      setError(submitError.message || 'No se pudo guardar el relevamiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRelevamiento = async (id: number) => {
    setSelectedRelevamiento(null);
    setDetailError(null);
    await fetchDetail(id);
  };

  const handleSaveDetail = async () => {
    if (!selectedRelevamiento) return;

    setDetailError(null);

    if (!detailDescripcion.trim() && !detailFotoUrl) {
      setDetailError('Completa una descripcion o carga una foto');
      return;
    }

    if (!detailUbicacionFisica.trim()) {
      setDetailError('La ubicacion fisica es obligatoria');
      return;
    }

    setIsSavingDetail(true);

    try {
      const res = await fetch(`/api/relevamiento/${selectedRelevamiento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: detailCodigo.trim(),
          descripcion: detailDescripcion.trim(),
          ubicacionFisica: detailUbicacionFisica.trim(),
          clasificacion: detailClasificacion,
          estado: detailEstado,
          observacion: detailObservacion.trim(),
          fotoUrl: detailFotoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el relevamiento');
      }

      applyDetailState(data.relevamiento);
      setRelevamientos((current) =>
        current.map((item) =>
          item.id === data.relevamiento.id ? data.relevamiento : item
        )
      );
      await fetchRelevamientos();

      if (data.duplicateCatalogProduct) {
        toast.error(
          `Ojo: ya existe ${data.duplicateCatalogProduct.codigo} en el catalogo`
        );
      } else {
        toast.success('Relevamiento actualizado');
      }
    } catch (saveError: any) {
      console.error('Error updating relevamiento:', saveError);
      setDetailError(saveError.message || 'No se pudo guardar el relevamiento');
    } finally {
      setIsSavingDetail(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRelevamiento) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/relevamiento/${deletingRelevamiento.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el relevamiento');
      }

      setDeletingRelevamiento(null);
      setSelectedRelevamiento(null);
      setDetailError(null);
      await fetchRelevamientos();
      toast.success('Relevamiento eliminado');
    } catch (deleteError: any) {
      console.error('Error deleting relevamiento:', deleteError);
      toast.error(deleteError.message || 'No se pudo eliminar el relevamiento');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtrosActivos = useMemo(
    () => [debouncedSearchListado, estadoFiltro].filter(Boolean).length,
    [debouncedSearchListado, estadoFiltro]
  );

  if (!vendedor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface-100 pb-8">
      <header className="sticky top-0 glass border-b border-surface-200 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/inventario" aria-label="Volver al inventario">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-200 rounded-xl transition-colors">
              <svg
                className="w-6 h-6 text-surface-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-surface-900">Relevamiento</h1>
            <p className="text-sm text-surface-500">
              Alta rapida y gestion de mercaderia relevada
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-surface-900">
                  Carga rapida
                </h2>
                <p className="mt-1 text-sm text-surface-500">
                  Identifica, clasifica y sigue con el proximo producto sin
                  entrar todavia a stock operativo.
                </p>
              </div>
              <Link
                href="/resumen"
                className="text-sm font-medium text-transfer-700 hover:text-transfer-800"
              >
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
                    <img
                      src={fotoPreview}
                      alt="Vista previa del relevamiento"
                      className="h-52 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoPreview(null);
                        setFotoUrl(null);
                        if (createFileInputRef.current) {
                          createFileInputRef.current.value = '';
                        }
                      }}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-surface-700 shadow-sm"
                      aria-label="Quitar foto"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-surface-50 px-4 py-8 text-surface-600 transition-colors hover:border-surface-400 hover:bg-surface-100"
                  >
                    <svg
                      className="mb-2 h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      {isUploadingCreate ? 'Subiendo foto...' : 'Tomar o subir foto'}
                    </span>
                  </button>
                )}
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCreateFileChange}
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
                <label className="mb-1.5 block text-sm font-medium text-surface-700">
                  Descripcion breve
                </label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={3}
                  placeholder="Ej. Caja de bisagras antiguas, juego de manijas, repuesto plastico..."
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-surface-700">
                  Clasificacion
                </p>
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
                <label className="mb-1.5 block text-sm font-medium text-surface-700">
                  Observacion corta
                </label>
                <textarea
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  rows={2}
                  placeholder="Dato util para revisar despues"
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="accent"
                  className="flex-1"
                  isLoading={isSubmitting}
                >
                  Guardar y siguiente
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetCreateForm}
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {duplicadosCatalogo.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-surface-900">
                Posibles duplicados en catalogo
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {duplicadosCatalogo.map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-3"
                >
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-white">
                    {producto.fotoUrl ? (
                      <img
                        src={producto.fotoUrl}
                        alt={producto.descripcion}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-surface-300">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-code text-sm font-semibold text-surface-900">
                      {producto.codigo}
                    </p>
                    <p className="truncate text-sm text-surface-600">
                      {producto.descripcion}
                    </p>
                  </div>
                  <Link
                    href={`/movimientos/nuevo?productoId=${producto.id}&tipo=ENTRADA`}
                    className="text-sm font-medium text-warning-800"
                  >
                    Usar existente
                  </Link>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-surface-900">
                  Bandeja de relevados
                </h2>
                <p className="text-sm text-surface-500">
                  Abre, corrige o elimina relevados sin salir del mismo flujo.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void fetchRelevamientos()}
              >
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3">
              <Input
                label="Buscar relevados"
                placeholder="Buscar por codigo, descripcion o ubicacion"
                value={searchListado}
                onChange={(event) => setSearchListado(event.target.value)}
              />

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setEstadoFiltro('')}
                  className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                    estadoFiltro === ''
                      ? 'bg-surface-900 text-white'
                      : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                  }`}
                >
                  Todos
                </button>
                {ESTADOS_RELEVAMIENTO.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setEstadoFiltro(estado)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                      estadoFiltro === estado
                        ? 'bg-surface-900 text-white'
                        : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    {ESTADO_RELEVAMIENTO_LABELS[estado]}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-surface-500">
                  {isLoadingListado
                    ? 'Actualizando bandeja...'
                    : `${relevamientos.length} relevado${
                        relevamientos.length === 1 ? '' : 's'
                      } visible${relevamientos.length === 1 ? '' : 's'}`}
                </p>
                {filtrosActivos > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchListado('');
                      setDebouncedSearchListado('');
                      setEstadoFiltro('');
                    }}
                    className="text-sm font-medium text-transfer-700 hover:text-transfer-800"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {isLoadingListado ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-24 rounded-2xl bg-surface-100 skeleton"
                  />
                ))}
              </div>
            ) : relevamientos.length === 0 ? (
              <div className="rounded-2xl bg-surface-50 px-4 py-8 text-center text-sm text-surface-500">
                No hay relevados con esos filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {relevamientos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleOpenRelevamiento(item.id)}
                    className="w-full text-left rounded-2xl border border-surface-200 bg-surface-50 p-3 transition-colors hover:border-surface-300 hover:bg-white"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-xl bg-white shrink-0">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt={item.descripcion}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-surface-300">
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.5-4.5a2 2 0 012.828 0L14 15m-2-2l1.5-1.5a2 2 0 012.828 0L21 16m-9-9h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-code text-sm font-semibold text-surface-900">
                            {item.codigo || item.codigoProvisorio}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[item.estado]}`}
                          >
                            {ESTADO_RELEVAMIENTO_LABELS[item.estado]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-surface-700">
                          {item.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-surface-500">
                          {CLASIFICACION_RELEVAMIENTO_LABELS[item.clasificacion]} |{' '}
                          {item.ubicacionFisica} | {formatDateTime(item.relevadoAt)}
                        </p>
                      </div>

                      <div className="self-center text-surface-400 shrink-0">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {(selectedRelevamiento || isLoadingDetail || detailError) && (
        <div
          className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => {
            setSelectedRelevamiento(null);
            setDetailError(null);
            setIsEditingDetail(false);
          }}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-surface-300 rounded-full" />
            </div>

            {isLoadingDetail ? (
              <div className="p-6 space-y-4">
                <div className="h-6 w-40 rounded-lg bg-surface-100 skeleton" />
                <div className="h-40 rounded-2xl bg-surface-100 skeleton" />
                <div className="h-20 rounded-2xl bg-surface-100 skeleton" />
              </div>
            ) : detailError ? (
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-surface-900">
                  No se pudo abrir el relevamiento
                </h2>
                <p className="text-sm text-surface-600">{detailError}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setDetailError(null);
                    setSelectedRelevamiento(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            ) : selectedRelevamiento ? (
              <div className="overflow-y-auto max-h-[90vh]">
                {detailFotoPreview ? (
                  <img
                    src={detailFotoPreview}
                    alt={selectedRelevamiento.descripcion}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-surface-100 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-surface-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                <div className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
                        Relevamiento #{selectedRelevamiento.id}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-surface-900">
                        {selectedRelevamiento.codigo ||
                          selectedRelevamiento.codigoProvisorio}
                      </h2>
                      <p className="mt-1 text-sm text-surface-500">
                        Cargado por {selectedRelevamiento.relevadoPor} el{' '}
                        {formatDateTime(selectedRelevamiento.relevadoAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_STYLES[selectedRelevamiento.estado]}`}
                    >
                      {ESTADO_RELEVAMIENTO_LABELS[selectedRelevamiento.estado]}
                    </span>
                  </div>

                  {detailError && (
                    <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                      {detailError}
                    </div>
                  )}
                  {isEditingDetail ? (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => detailFileInputRef.current?.click()}
                          isLoading={isUploadingDetail}
                        >
                          {detailFotoUrl ? 'Cambiar foto' : 'Cargar foto'}
                        </Button>
                        {detailFotoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setDetailFotoUrl(null);
                              setDetailFotoPreview(null);
                              if (detailFileInputRef.current) {
                                detailFileInputRef.current.value = '';
                              }
                            }}
                          >
                            Quitar foto
                          </Button>
                        )}
                        <input
                          ref={detailFileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleDetailFileChange}
                        />
                      </div>

                      <Input
                        label="Codigo visible"
                        value={detailCodigo}
                        onChange={(event) => setDetailCodigo(event.target.value)}
                      />

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-700">
                          Descripcion breve
                        </label>
                        <textarea
                          value={detailDescripcion}
                          onChange={(event) =>
                            setDetailDescripcion(event.target.value)
                          }
                          rows={3}
                          className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                        />
                      </div>

                      <Input
                        label="Ubicacion fisica"
                        value={detailUbicacionFisica}
                        onChange={(event) =>
                          setDetailUbicacionFisica(event.target.value)
                        }
                      />

                      <div>
                        <p className="mb-2 text-sm font-medium text-surface-700">
                          Clasificacion
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {CLASIFICACIONES_RELEVAMIENTO.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setDetailClasificacion(item)}
                              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                detailClasificacion === item
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
                        <p className="mb-2 text-sm font-medium text-surface-700">
                          Estado
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ESTADOS_RELEVAMIENTO.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setDetailEstado(item)}
                              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                detailEstado === item
                                  ? 'border-surface-900 bg-surface-900 text-white'
                                  : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300'
                              }`}
                            >
                              {ESTADO_RELEVAMIENTO_LABELS[item]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-surface-700">
                          Observacion corta
                        </label>
                        <textarea
                          value={detailObservacion}
                          onChange={(event) =>
                            setDetailObservacion(event.target.value)
                          }
                          rows={3}
                          className="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-surface-900 placeholder:text-surface-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-surface-500"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => applyDetailState(selectedRelevamiento)}
                          disabled={isSavingDetail}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="accent"
                          className="flex-1"
                          onClick={handleSaveDetail}
                          isLoading={isSavingDetail}
                        >
                          Guardar cambios
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-surface-50 p-4">
                          <p className="text-sm font-medium text-surface-700">
                            Descripcion
                          </p>
                          <p className="mt-1 text-sm text-surface-600">
                            {selectedRelevamiento.descripcion}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-surface-50 p-4">
                            <p className="text-xs font-medium text-surface-500">
                              Codigo provisorio
                            </p>
                            <p className="mt-1 text-sm font-code text-surface-900">
                              {selectedRelevamiento.codigoProvisorio}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface-50 p-4">
                            <p className="text-xs font-medium text-surface-500">
                              Ubicacion fisica
                            </p>
                            <p className="mt-1 text-sm text-surface-900">
                              {selectedRelevamiento.ubicacionFisica}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-surface-50 p-4">
                            <p className="text-xs font-medium text-surface-500">
                              Clasificacion
                            </p>
                            <p className="mt-1 text-sm text-surface-900">
                              {
                                CLASIFICACION_RELEVAMIENTO_LABELS[
                                  selectedRelevamiento.clasificacion
                                ]
                              }
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface-50 p-4">
                            <p className="text-xs font-medium text-surface-500">
                              Ultima actualizacion
                            </p>
                            <p className="mt-1 text-sm text-surface-900">
                              {formatDateTime(selectedRelevamiento.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {selectedRelevamiento.observacion && (
                          <div className="rounded-2xl bg-surface-50 p-4">
                            <p className="text-sm font-medium text-surface-700">
                              Observacion
                            </p>
                            <p className="mt-1 text-sm text-surface-600 whitespace-pre-wrap">
                              {selectedRelevamiento.observacion}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setIsEditingDetail(true)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="flex-1"
                          onClick={() =>
                            setDeletingRelevamiento(selectedRelevamiento)
                          }
                        >
                          Eliminar
                        </Button>
                      </div>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setSelectedRelevamiento(null);
                      setDetailError(null);
                      setIsEditingDetail(false);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {deletingRelevamiento && (
        <ConfirmDeleteModal
          title="Eliminar relevamiento"
          message="Se borrara este relevamiento y no se puede deshacer."
          detail={`${
            deletingRelevamiento.codigo || deletingRelevamiento.codigoProvisorio
          } | ${deletingRelevamiento.descripcion}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingRelevamiento(null)}
          isLoading={isDeleting}
        />
      )}
    </main>
  );
}
