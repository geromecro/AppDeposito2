#!/usr/bin/env node

const path = require('path');
const { existsSync } = require('fs');
const XLSX = require('xlsx');
const { PrismaClient, TipoMovimiento } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const DEFAULT_VENDEDOR = 'Importacion';
const DEFAULT_UBICACION = 'Deposito';
const DEFAULT_DESCRIPCION_PREFIX = 'Pendiente descripcion';
const ENTRY_PATTERN = /^\s*(\S.*?)\s*[xX]\s*(\d+)(?:\s*\((.*?)\))?\s*$/;

function parseArgs(argv) {
  const options = {
    apply: false,
    dryRun: true,
    ubicacion: DEFAULT_UBICACION,
    vendedor: DEFAULT_VENDEDOR,
    descripcionPrefix: DEFAULT_DESCRIPCION_PREFIX,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      options.dryRun = false;
      continue;
    }

    if (arg === '--dry-run') {
      options.apply = false;
      options.dryRun = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      continue;
    }

    const next = argv[index + 1];

    if (arg === '--file' && next) {
      options.file = next;
      index += 1;
      continue;
    }

    if (arg === '--sheet' && next) {
      options.sheet = next;
      index += 1;
      continue;
    }

    if (arg === '--ubicacion' && next) {
      options.ubicacion = next;
      index += 1;
      continue;
    }

    if (arg === '--vendedor' && next) {
      options.vendedor = next;
      index += 1;
      continue;
    }

    if (arg === '--descripcion-prefix' && next) {
      options.descripcionPrefix = next;
      index += 1;
      continue;
    }

    throw new Error(`Argumento no reconocido o incompleto: ${arg}`);
  }

  if (!options.file) {
    throw new Error(
      'Debes indicar el archivo con --file "C:\\ruta\\archivo.xlsx". Usa --apply para ejecutar la importacion real.'
    );
  }

  return options;
}

function parseWorkbook(filePath, requestedSheet) {
  const workbook = XLSX.readFile(filePath, {
    raw: false,
    dense: true,
  });

  const sheetName = requestedSheet || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no existe en el archivo.`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const invalidRows = [];
  const aggregated = new Map();

  rows.forEach((row, rowIndex) => {
    const rawValue = Array.isArray(row) ? row[0] : '';
    const text = String(rawValue || '').trim();

    if (!text) {
      return;
    }

    const match = ENTRY_PATTERN.exec(text);
    if (!match) {
      invalidRows.push({
        row: rowIndex + 1,
        raw: text,
      });
      return;
    }

    const codigo = match[1].trim();
    const cantidad = Number.parseInt(match[2], 10);
    const annotation = match[3] ? match[3].trim() : null;

    if (!codigo || !Number.isInteger(cantidad) || cantidad < 1) {
      invalidRows.push({
        row: rowIndex + 1,
        raw: text,
      });
      return;
    }

    const current = aggregated.get(codigo) || {
      codigo,
      cantidad: 0,
      rows: [],
      rawValues: [],
      annotations: new Set(),
    };

    current.cantidad += cantidad;
    current.rows.push(rowIndex + 1);
    current.rawValues.push(text);
    if (annotation) {
      current.annotations.add(annotation);
    }

    aggregated.set(codigo, current);
  });

  return {
    fileName: path.basename(filePath),
    sheetName,
    invalidRows,
    items: Array.from(aggregated.values())
      .map((item) => ({
        ...item,
        annotations: Array.from(item.annotations).sort(),
      }))
      .sort((left, right) => left.codigo.localeCompare(right.codigo, 'es')),
  };
}

function buildDescription(codigo, descripcionPrefix) {
  return `${descripcionPrefix} - ${codigo}`;
}

function buildImportNote(item, context) {
  const parts = [
    `Importacion inicial desde ${context.fileName}`,
    `hoja ${context.sheetName}`,
    `filas ${item.rows.join(', ')}`,
  ];

  if (item.rows.length > 1) {
    parts.push('duplicados consolidados');
  }

  if (item.annotations.length > 0) {
    parts.push(`observaciones: ${item.annotations.join(', ')}`);
  }

  return parts.join(' | ');
}

function summarize(items, invalidRows, existingProducts, options, context) {
  const existingByCode = new Map(
    existingProducts.map((product) => [
      product.codigo,
      {
        id: product.id,
        descripcion: product.descripcion,
        stockDeposito: product.stocks.find((stock) => stock.ubicacion === 'Deposito')?.cantidad || 0,
        stockLocal: product.stocks.find((stock) => stock.ubicacion === 'Local')?.cantidad || 0,
      },
    ])
  );

  const duplicates = items
    .filter((item) => item.rows.length > 1)
    .map((item) => ({
      codigo: item.codigo,
      cantidad: item.cantidad,
      rows: item.rows,
    }));

  const annotated = items
    .filter((item) => item.annotations.length > 0)
    .map((item) => ({
      codigo: item.codigo,
      cantidad: item.cantidad,
      annotations: item.annotations,
      rows: item.rows,
    }));

  const existing = items
    .filter((item) => existingByCode.has(item.codigo))
    .map((item) => ({
      codigo: item.codigo,
      cantidadArchivo: item.cantidad,
      ...existingByCode.get(item.codigo),
    }));

  return {
    mode: options.apply ? 'apply' : 'dry-run',
    file: context.filePath,
    sheet: context.sheetName,
    ubicacionDestino: options.ubicacion,
    vendedor: options.vendedor,
    descripcionPrefix: options.descripcionPrefix,
    totalRowsProcesadas: items.reduce((sum, item) => sum + item.rows.length, 0) + invalidRows.length,
    totalCodigosUnicos: items.length,
    totalUnidades: items.reduce((sum, item) => sum + item.cantidad, 0),
    filasInvalidas: invalidRows,
    codigosDuplicados: duplicates,
    codigosConObservacion: annotated,
    codigosExistentes: existing,
    muestraImportacion: items.slice(0, 12).map((item) => ({
      codigo: item.codigo,
      cantidad: item.cantidad,
      descripcionNueva: buildDescription(item.codigo, options.descripcionPrefix),
      rows: item.rows,
      annotations: item.annotations,
    })),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(options.file);

  if (!existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`);
  }

  const workbookData = parseWorkbook(filePath, options.sheet);
  const codigos = workbookData.items.map((item) => item.codigo);
  const existingProducts = codigos.length
    ? await prisma.producto.findMany({
        where: { codigo: { in: codigos } },
        include: { stocks: true },
      })
    : [];

  const summary = summarize(
    workbookData.items,
    workbookData.invalidRows,
    existingProducts,
    options,
    {
      filePath,
      sheetName: workbookData.sheetName,
    }
  );

  console.log(JSON.stringify(summary, null, 2));

  if (workbookData.invalidRows.length > 0) {
    throw new Error('Se encontraron filas invalidas. Corrige el archivo o ajusta el parser antes de importar.');
  }

  if (existingProducts.length > 0) {
    throw new Error(
      `La importacion fue bloqueada porque ${existingProducts.length} codigo(s) ya existen en catalogo.`
    );
  }

  if (!options.apply) {
    console.log('\nDry-run completado. No se escribieron datos.');
    console.log('Ejecuta nuevamente con --apply para importar en serio.');
    return;
  }

  const created = await prisma.$transaction(
    async (tx) => {
      let productos = 0;
      let movimientos = 0;
      let stocks = 0;

      for (const item of workbookData.items) {
        const producto = await tx.producto.create({
          data: {
            codigo: item.codigo,
            descripcion: buildDescription(item.codigo, options.descripcionPrefix),
          },
        });
        productos += 1;

        await tx.movimiento.create({
          data: {
            tipo: TipoMovimiento.ENTRADA,
            cantidad: item.cantidad,
            ubicacionDestino: options.ubicacion,
            vendedor: options.vendedor,
            nota: buildImportNote(item, {
              fileName: workbookData.fileName,
              sheetName: workbookData.sheetName,
            }),
            productoId: producto.id,
          },
        });
        movimientos += 1;

        await tx.stock.create({
          data: {
            productoId: producto.id,
            ubicacion: options.ubicacion,
            cantidad: item.cantidad,
          },
        });
        stocks += 1;
      }

      return {
        productos,
        movimientos,
        stocks,
      };
    },
    {
      maxWait: 10000,
      timeout: 120000,
    }
  );

  console.log('\nImportacion completada.');
  console.log(JSON.stringify(created, null, 2));
}

main()
  .catch((error) => {
    console.error(`\n[import-deposito-stock] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
