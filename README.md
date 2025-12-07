# App Control de Traslado de Mercadería

Aplicación móvil-first para registrar el traslado de mercadería desde el local de repuestos/autopartes hacia el nuevo depósito.

## Setup Inicial

### 1. Crear base de datos en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto
2. Ir a **Settings > Database** y copiar el connection string (Session Pooler)
3. Ir a **Settings > API** y copiar:
   - Project URL
   - anon public key

### 2. Crear bucket de Storage

1. En Supabase, ir a **Storage**
2. Crear nuevo bucket llamado `productos-fotos`
3. Hacerlo **público** (Public bucket)
4. En Policies, agregar política para permitir uploads:
   ```sql
   CREATE POLICY "Allow public uploads" ON storage.objects
   FOR INSERT TO public WITH CHECK (bucket_id = 'productos-fotos');
   ```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
```

### 4. Inicializar base de datos

```bash
npx prisma generate
npx prisma db push
```

### 5. Iniciar servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en http://localhost:3000

## Vendedores Configurados

- Geronimo
- Mateo
- Rodrigo
- Alexander
- Alejandro
- Emanuel
- Nicolas

Para agregar/modificar vendedores, editar `lib/constants.ts`

## Estructura del Proyecto

```
app/
├── page.tsx                    # Login (seleccionar vendedor)
├── transferencias/
│   ├── page.tsx               # Lista de productos trasladados
│   └── nueva/page.tsx         # Formulario con cámara
├── resumen/
│   └── page.tsx               # Estadísticas
└── api/
    ├── productos/             # CRUD de productos
    ├── upload/                # Subida de fotos
    └── stats/                 # Estadísticas
```

## Deploy a Vercel

1. Subir código a GitHub
2. Conectar repo en Vercel
3. Agregar variables de entorno en Vercel Dashboard
4. Deploy automático

## Uso

1. Abrir la app en el celular
2. Seleccionar tu nombre
3. Tocar "+" para agregar producto
4. Completar código y descripción
5. Opcionalmente tomar foto
6. Guardar
