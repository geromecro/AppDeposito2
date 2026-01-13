'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { Input } from '@/components/Input';
import { Card, CardBody } from '@/components/Card';
import { UBICACIONES, TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_LABELS, TIPO_MOVIMIENTO_COLORS, TipoMovimiento } from '@/lib/constants';

interface ProductoExistente {
  id: number;
  codigo: string;
  descripcion: string;
  fotoUrl: string | null;
}

interface StockInfo {
  stockDeposito: number;
  stockLocal: number;
}

// Wrapper component to handle Suspense for useSearchParams
export default function NuevoMovimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-primary-500">Cargando...</p></div>}>
      <NuevoMovimientoContent />
    </Suspense>
  );
}

function NuevoMovimientoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const [vendedor, setVendedor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tipo de movimiento
  const [tipo, setTipo] = useState<TipoMovimiento | ''>('');

  // Producto (nuevo o existente)
  const [modoProducto, setModoProducto] = useState<'buscar' | 'nuevo'>('buscar');
  const [busqueda, setBusqueda] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoExistente[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoExistente | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [isBuscando, setIsBuscando] = useState(false);

  // Datos del movimiento
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [ubicacionOrigen, setUbicacionOrigen] = useState('');
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  const [nota, setNota] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  useEffect(() => {
    const storedVendedor = localStorage.getItem('vendedor');
    if (!storedVendedor) {
      router.push('/');
      return;
    }
    setVendedor(storedVendedor);
  }, [router]);

  // Precargar producto y tipo desde parámetros de URL
  useEffect(() => {
    const tipoParam = searchParams.get('tipo') as TipoMovimiento | null;
    const productoIdParam = searchParams.get('productoId');

    if (tipoParam && TIPOS_MOVIMIENTO.includes(tipoParam)) {
      setTipo(tipoParam);
    }

    if (productoIdParam) {
      // Cargar el producto por ID
      fetch(`/api/stock?search=`)
        .then(res => res.json())
        .then(data => {
          const producto = data.stock?.find((s: any) => s.producto.id === parseInt(productoIdParam));
          if (producto) {
            setProductoSeleccionado(producto.producto);
            setStockInfo({
              stockDeposito: producto.stockDeposito,
              stockLocal: producto.stockLocal,
            });
          }
        })
        .catch(console.error);
    }
  }, [searchParams]);

  // Buscar productos existentes
  useEffect(() => {
    if (busqueda.length < 2) {
      setProductosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsBuscando(true);
      try {
        const res = await fetch(`/api/stock?search=${encodeURIComponent(busqueda)}`);
        const data = await res.json();
        setProductosEncontrados(data.stock?.map((s: any) => ({
          ...s.producto,
          stockDeposito: s.stockDeposito,
          stockLocal: s.stockLocal,
        })) || []);
      } catch (error) {
        console.error('Error buscando productos:', error);
      } finally {
        setIsBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  // Cargar stock cuando se selecciona producto
  useEffect(() => {
    if (productoSeleccionado) {
      const fetchStock = async () => {
        try {
          const res = await fetch(`/api/stock?search=${encodeURIComponent(productoSeleccionado.codigo)}`);
          const data = await res.json();
          const stockItem = data.stock?.find((s: any) => s.producto.id === productoSeleccionado.id);
          if (stockItem) {
            setStockInfo({
              stockDeposito: stockItem.stockDeposito,
              stockLocal: stockItem.stockLocal,
            });
          }
        } catch (error) {
          console.error('Error cargando stock:', error);
        }
      };
      fetchStock();
    }
  }, [productoSeleccionado]);

  const handleSelectProducto = (producto: any) => {
    setProductoSeleccionado({
      id: producto.id,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      fotoUrl: producto.fotoUrl,
    });
    setStockInfo({
      stockDeposito: producto.stockDeposito || 0,
      stockLocal: producto.stockLocal || 0,
    });
    setBusqueda('');
    setProductosEncontrados([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setFotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    setUploadStatus('Comprimiendo...');
    try {
      const compressionOptions = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      setUploadStatus('Subiendo...');

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('vendedor', vendedor || 'anon');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir imagen');

      const data = await res.json();
      setFotoUrl(data.url);
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Error al subir la imagen');
      setFotoPreview(null);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const removeFoto = () => {
    setFotoUrl(null);
    setFotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tipo) {
      setError('Selecciona un tipo de movimiento');
      return;
    }

    if (modoProducto === 'buscar' && !productoSeleccionado) {
      setError('Selecciona un producto existente o crea uno nuevo');
      return;
    }

    if (modoProducto === 'nuevo' && (!codigo.trim() || !descripcion.trim())) {
      setError('Codigo y descripcion son requeridos para producto nuevo');
      return;
    }

    // Validar ubicaciones según tipo
    if (tipo === 'ENTRADA' && !ubicacionDestino) {
      setError('Selecciona la ubicacion de destino');
      return;
    }

    if (tipo === 'TRASLADO' && (!ubicacionOrigen || !ubicacionDestino)) {
      setError('Selecciona ubicacion de origen y destino');
      return;
    }

    if (tipo === 'SALIDA' && !ubicacionOrigen) {
      setError('Selecciona la ubicacion de origen');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: any = {
        tipo,
        cantidad: parseInt(cantidad) || 1,
        vendedor,
        nota: nota.trim() || null,
        fotoUrl: tipo === 'ENTRADA' ? fotoUrl : null,
      };

      if (modoProducto === 'buscar' && productoSeleccionado) {
        body.productoId = productoSeleccionado.id;
      } else {
        body.codigo = codigo.trim();
        body.descripcion = descripcion.trim();
        body.fotoUrl = fotoUrl;
      }

      if (tipo === 'ENTRADA') {
        body.ubicacionDestino = ubicacionDestino;
      } else if (tipo === 'TRASLADO') {
        body.ubicacionOrigen = ubicacionOrigen;
        body.ubicacionDestino = ubicacionDestino;
      } else if (tipo === 'SALIDA') {
        body.ubicacionOrigen = ubicacionOrigen;
      }

      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar movimiento');
      }

      router.push('/inventario');
    } catch (error: any) {
      console.error('Error saving:', error);
      setError(error.message || 'Error al registrar movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vendedor) {
    return null;
  }

  const getStockDisponible = () => {
    if (!stockInfo) return 0;
    if (ubicacionOrigen === 'Deposito') return stockInfo.stockDeposito;
    if (ubicacionOrigen === 'Local') return stockInfo.stockLocal;
    return 0;
  };

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-primary-200 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/inventario" className="text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-primary-900">Nuevo Movimiento</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Selector de tipo */}
        <Card>
          <CardBody>
            <label className="block text-sm font-medium text-primary-700 mb-3">
              Tipo de movimiento *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_MOVIMIENTO.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    tipo === t
                      ? 'border-primary-800 bg-primary-50'
                      : 'border-primary-200 hover:border-primary-400'
                  }`}
                >
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${TIPO_MOVIMIENTO_COLORS[t]}`}>
                    {TIPO_MOVIMIENTO_LABELS[t]}
                  </div>
                  <p className="text-xs text-primary-500">
                    {t === 'ENTRADA' && 'Ingreso stock'}
                    {t === 'TRASLADO' && 'Entre ubicaciones'}
                    {t === 'SALIDA' && 'Sale del stock'}
                  </p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {tipo && (
          <>
            {/* Selección de producto */}
            <Card>
              <CardBody>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setModoProducto('buscar'); setProductoSeleccionado(null); }}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      modoProducto === 'buscar'
                        ? 'bg-primary-800 text-white'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    Producto existente
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModoProducto('nuevo'); setProductoSeleccionado(null); }}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      modoProducto === 'nuevo'
                        ? 'bg-primary-800 text-white'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    Producto nuevo
                  </button>
                </div>

                {modoProducto === 'buscar' ? (
                  <div>
                    {productoSeleccionado ? (
                      <div className="bg-accent-50 border border-accent-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-primary-900">{productoSeleccionado.codigo}</p>
                            <p className="text-sm text-primary-600">{productoSeleccionado.descripcion}</p>
                            {stockInfo && (
                              <p className="text-xs text-primary-500 mt-1">
                                Stock: Dep {stockInfo.stockDeposito} | Local {stockInfo.stockLocal}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setProductoSeleccionado(null); setStockInfo(null); }}
                            className="text-primary-500 hover:text-primary-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          label="Buscar producto"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Codigo o descripcion..."
                        />
                        {isBuscando && (
                          <p className="text-xs text-primary-500 mt-1">Buscando...</p>
                        )}
                        {productosEncontrados.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                            {productosEncontrados.map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProducto(p)}
                                className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-primary-100 last:border-b-0"
                              >
                                <p className="font-medium text-primary-900">{p.codigo}</p>
                                <p className="text-sm text-primary-600">{p.descripcion}</p>
                                <p className="text-xs text-primary-500">
                                  Dep: {p.stockDeposito} | Local: {p.stockLocal}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Codigo *"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ej: ALT-001"
                    />
                    <Input
                      label="Descripcion *"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Ej: Alternador Bosch 12V"
                    />
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Ubicaciones según tipo */}
            <Card>
              <CardBody className="space-y-4">
                {(tipo === 'TRASLADO' || tipo === 'SALIDA') && (
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Ubicacion origen *
                    </label>
                    <select
                      value={ubicacionOrigen}
                      onChange={(e) => setUbicacionOrigen(e.target.value)}
                      className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {UBICACIONES.map((ubi) => (
                        <option key={ubi} value={ubi}>{ubi}</option>
                      ))}
                    </select>
                    {stockInfo && ubicacionOrigen && (
                      <p className="text-xs text-primary-500 mt-1">
                        Disponible: {getStockDisponible()} unidades
                      </p>
                    )}
                  </div>
                )}

                {(tipo === 'ENTRADA' || tipo === 'TRASLADO') && (
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Ubicacion destino *
                    </label>
                    <select
                      value={ubicacionDestino}
                      onChange={(e) => setUbicacionDestino(e.target.value)}
                      className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-accent-500"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {UBICACIONES.filter(ubi => tipo !== 'TRASLADO' || ubi !== ubicacionOrigen).map((ubi) => (
                        <option key={ubi} value={ubi}>{ubi}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  label="Cantidad *"
                  type="number"
                  min="1"
                  max={tipo !== 'ENTRADA' && stockInfo ? getStockDisponible() : undefined}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />

                <Input
                  label="Nota (opcional)"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Pedido #123, Venta cliente X..."
                />
              </CardBody>
            </Card>

            {/* Foto solo para ENTRADA con producto nuevo */}
            {tipo === 'ENTRADA' && modoProducto === 'nuevo' && (
              <Card>
                <CardBody>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Foto (opcional)
                  </label>

                  {fotoPreview ? (
                    <div className="relative">
                      <img
                        src={fotoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <span className="text-white">{uploadStatus || 'Procesando...'}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={removeFoto}
                        className="absolute top-2 right-2 w-8 h-8 bg-error-500 text-white rounded-full flex items-center justify-center"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-400 transition-colors">
                      <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="mt-2 text-sm text-primary-500">Toca para tomar foto</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Boton guardar */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting || isUploading}
            >
              Registrar {TIPO_MOVIMIENTO_LABELS[tipo]}
            </Button>
          </>
        )}
      </form>
    </main>
  );
}
