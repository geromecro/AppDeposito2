# App Depósito - Gestión de Inventario

Aplicación móvil-first para gestión de inventario entre ubicaciones (Local y Depósito). Permite registrar movimientos de mercadería (entradas, traslados, salidas) con captura opcional de fotos, manteniendo stock en tiempo real por ubicación.

## Funcionalidades

- **Inventario**: Vista de stock por ubicación con búsqueda y filtros
- **Movimientos**: Registro de entradas, traslados entre ubicaciones y salidas
- **Historial**: Lista de movimientos con filtros por tipo, vendedor, fecha y producto
- **Exportación**: Descarga de movimientos en formato CSV
- **Estadísticas**: Dashboard con métricas de inventario
- **Fotos**: Captura de imágenes de productos y movimientos

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
├── inventario/page.tsx         # Stock por ubicación con búsqueda
├── movimientos/
│   ├── page.tsx               # Historial de movimientos
│   └── nuevo/page.tsx         # Crear movimiento (entrada/traslado/salida)
├── resumen/page.tsx           # Estadísticas y métricas
└── api/
    ├── productos/             # CRUD catálogo de productos
    ├── movimientos/           # CRUD movimientos
    ├── stock/                 # Consultas de stock por ubicación
    ├── stats/                 # Estadísticas agregadas
    ├── export/                # Exportación CSV
    └── upload/                # Subida de fotos a Supabase
```

## Tipos de Movimiento

| Tipo | Descripción | Efecto en Stock |
|------|-------------|-----------------|
| ENTRADA | Producto ingresa al inventario | +cantidad en destino |
| TRASLADO | Producto se mueve entre ubicaciones | -origen, +destino |
| SALIDA | Producto sale del inventario | -cantidad en origen |

## Deploy a Vercel

1. Subir código a GitHub
2. Conectar repo en Vercel
3. Agregar variables de entorno en Vercel Dashboard
4. Deploy automático
