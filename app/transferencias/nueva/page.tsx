'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardBody } from '@/components/Card';
import { UBICACIONES } from '@/lib/constants';

export default function NuevaTransferenciaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendedor, setVendedor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [ubicacion, setUbicacion] = useState('');
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview inmediatamente con el archivo original
    const reader = new FileReader();
    reader.onload = (e) => {
      setFotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    setUploadStatus('Comprimiendo...');
    try {
      // Comprimir imagen antes de subir
      const compressionOptions = {
        maxSizeMB: 0.3,           // Maximo 300KB
        maxWidthOrHeight: 1200,   // Maximo 1200px de ancho o alto
        useWebWorker: true,       // Usar Web Worker para no bloquear UI
        fileType: 'image/jpeg',   // Convertir a JPEG
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      setUploadStatus('Subiendo...');

      // Subir archivo comprimido a Supabase
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('vendedor', vendedor || 'anon');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await res.json();
      setFotoUrl(data.url);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir la imagen');
      setFotoPreview(null);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim() || !descripcion.trim()) {
      alert('Codigo y descripcion son requeridos');
      return;
    }

    if (!ubicacion) {
      alert('Selecciona una ubicacion');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          cantidad: parseInt(cantidad) || 1,
          fotoUrl,
          vendedor,
          ubicacion,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar');
      }

      router.push('/transferencias');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFoto = () => {
    setFotoUrl(null);
    setFotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!vendedor) {
    return null;
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-primary-200 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/transferencias" className="text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-primary-900">Agregar Producto</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Foto */}
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

        {/* Datos del producto */}
        <Card>
          <CardBody className="space-y-4">
            {/* Ubicacion */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Ubicacion *
              </label>
              <select
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              >
                <option value="">Seleccionar ubicacion...</option>
                {UBICACIONES.map((ubi) => (
                  <option key={ubi} value={ubi}>
                    {ubi}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Codigo *"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: ALT-001"
              required
            />

            <Input
              label="Descripcion *"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Alternador Bosch 12V"
              required
            />

            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </CardBody>
        </Card>

        {/* Boton guardar */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting || isUploading}
        >
          Guardar Producto
        </Button>
      </form>
    </main>
  );
}
