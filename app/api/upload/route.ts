import { NextRequest, NextResponse } from 'next/server';
import { supabase, BUCKET_NAME } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vendedor = formData.get('vendedor') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibio archivo' },
        { status: 400 }
      );
    }

    // Generar nombre unico
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${vendedor || 'anon'}.${extension}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Error al subir imagen: ' + error.message },
        { status: 500 }
      );
    }

    // Obtener URL publica
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Error in upload:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
