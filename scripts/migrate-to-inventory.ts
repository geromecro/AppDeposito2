/**
 * Script de migración: Convierte datos del modelo legacy al nuevo sistema de inventario
 *
 * Los registros actuales en "Producto" se interpretan como ENTRADAS.
 * Se agrupan por código, se crea un producto único en ProductoCatalogo,
 * y se generan los movimientos y stocks correspondientes.
 *
 * Ejecutar con: npx ts-node scripts/migrate-to-inventory.ts
 * O: npx tsx scripts/migrate-to-inventory.ts
 */

import { PrismaClient, TipoMovimiento } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductoLegacy {
  id: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  fotoUrl: string | null;
  vendedor: string;
  ubicacion: string | null;
  createdAt: Date;
}

async function migrate() {
  console.log('Iniciando migración...\n');

  // 1. Leer todos los productos legacy
  const productosLegacy = await prisma.productoLegacy.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Encontrados ${productosLegacy.length} registros legacy\n`);

  if (productosLegacy.length === 0) {
    console.log('No hay datos para migrar.');
    return;
  }

  // 2. Agrupar por código
  const porCodigo = new Map<string, ProductoLegacy[]>();
  for (const p of productosLegacy) {
    const grupo = porCodigo.get(p.codigo) || [];
    grupo.push(p);
    porCodigo.set(p.codigo, grupo);
  }

  console.log(`Códigos únicos: ${porCodigo.size}\n`);

  let productosCreados = 0;
  let movimientosCreados = 0;
  let stocksCreados = 0;

  // 3. Procesar cada grupo
  for (const [codigo, registros] of porCodigo) {
    console.log(`Procesando: ${codigo} (${registros.length} registros)`);

    // Tomar descripción y foto del registro más reciente que tenga foto
    const conFoto = registros.filter(r => r.fotoUrl);
    const masReciente = registros.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const fotoUrl = conFoto.length > 0
      ? conFoto.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].fotoUrl
      : null;

    try {
      // Verificar si ya existe en el nuevo sistema
      const existente = await prisma.producto.findUnique({
        where: { codigo },
      });

      if (existente) {
        console.log(`  -> Ya existe, saltando...`);
        continue;
      }

      // Crear producto en nueva tabla
      const nuevoProducto = await prisma.producto.create({
        data: {
          codigo,
          descripcion: masReciente.descripcion,
          fotoUrl,
        },
      });
      productosCreados++;

      // Calcular stocks por ubicación
      const stockPorUbicacion = new Map<string, number>();

      // Crear movimientos de ENTRADA por cada registro
      for (const reg of registros) {
        const ubicacion = reg.ubicacion || 'Deposito';

        await prisma.movimiento.create({
          data: {
            tipo: TipoMovimiento.ENTRADA,
            cantidad: reg.cantidad,
            ubicacionDestino: ubicacion,
            vendedor: reg.vendedor,
            nota: 'Migrado desde sistema anterior',
            fotoUrl: reg.fotoUrl,
            productoId: nuevoProducto.id,
            createdAt: reg.createdAt, // Preservar fecha original
          },
        });
        movimientosCreados++;

        // Acumular stock
        const stockActual = stockPorUbicacion.get(ubicacion) || 0;
        stockPorUbicacion.set(ubicacion, stockActual + reg.cantidad);
      }

      // Crear stocks
      for (const [ubicacion, cantidad] of stockPorUbicacion) {
        await prisma.stock.create({
          data: {
            productoId: nuevoProducto.id,
            ubicacion,
            cantidad,
          },
        });
        stocksCreados++;
      }

      console.log(`  -> Producto creado, ${registros.length} movimientos, ${stockPorUbicacion.size} stocks`);

    } catch (error) {
      console.error(`  -> Error procesando ${codigo}:`, error);
    }
  }

  console.log('\n========================================');
  console.log('Migración completada:');
  console.log(`  - Productos creados: ${productosCreados}`);
  console.log(`  - Movimientos creados: ${movimientosCreados}`);
  console.log(`  - Stocks creados: ${stocksCreados}`);
  console.log('========================================\n');

  // Verificar totales
  const totalUnidadesLegacy = productosLegacy.reduce((sum, p) => sum + p.cantidad, 0);
  const stocksNuevos = await prisma.stock.findMany();
  const totalUnidadesNuevo = stocksNuevos.reduce((sum, s) => sum + s.cantidad, 0);

  console.log('Verificación de integridad:');
  console.log(`  - Total unidades legacy: ${totalUnidadesLegacy}`);
  console.log(`  - Total unidades nuevo: ${totalUnidadesNuevo}`);

  if (totalUnidadesLegacy === totalUnidadesNuevo) {
    console.log('  ✓ Los totales coinciden\n');
  } else {
    console.log('  ⚠ Los totales NO coinciden - revisar datos\n');
  }
}

migrate()
  .catch((e) => {
    console.error('Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
