#!/usr/bin/env node

/**
 * Carga inicial del catálogo de productos desde planilla física.
 * Formato descripción: "salidas - altura - diámetro interno"
 * Los productos con código ESPECIAL se numeran ESPECIAL-01..ESPECIAL-11.
 *
 * Uso:
 *   node scripts/seed-catalogo-inicial.js            # dry-run (muestra qué haría)
 *   node scripts/seed-catalogo-inicial.js --apply    # ejecuta la carga
 */

const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const UBICACION = 'Deposito';

// Datos transcriptos de la planilla física.
// descripcion = "salidas - altura - diámetroInterno" (altura vacía → "-")
const PRODUCTOS = [
  { codigo: 'EA01-EA073.10',         descripcion: '3X1 - 24MM - 74MM',  cantidad: 6  },
  { codigo: 'CITROEN',               descripcion: '3X1 - 21MM - 83MM',  cantidad: 1  },
  { codigo: 'EMI099.10',             descripcion: '3X1 - - 99MM',       cantidad: 1  },
  { codigo: 'ESPECIAL-01',           descripcion: '3X1 - 28MM - 88MM',  cantidad: 1  },
  { codigo: 'EMO091.20',             descripcion: '3X1 - - 91MM',       cantidad: 1  },
  { codigo: 'ESPECIAL-02',           descripcion: '3X2 - 29MM - 90MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-03',           descripcion: '3X1 - 29MM - 94MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-04',           descripcion: '6X2 - 30MM - 98MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-05',           descripcion: '6X1 - 33MM - 98MM',  cantidad: 1  },
  { codigo: 'EA083.20',              descripcion: '3X1 - 25MM - 83MM',  cantidad: 3  },
  { codigo: 'EB089.63',              descripcion: '3X1 - - 89MM',       cantidad: 2  },
  { codigo: 'ENA094.10/ENA01',       descripcion: '3X1 - - 94MM',       cantidad: 12 },
  { codigo: 'MOTOROLA',              descripcion: '3X1 - 20MM - 86MM',  cantidad: 1  },
  { codigo: 'ENA094.21',             descripcion: '3X1 - - 94MM',       cantidad: 1  },
  { codigo: 'EA02',                  descripcion: '3X1 - 22MM - 83MM',  cantidad: 1  },
  { codigo: 'ENA03',                 descripcion: '3X2 - 28MM - 94MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-06',           descripcion: '3X2 - 29MM - 94MM',  cantidad: 2  },
  { codigo: 'EH107.10',              descripcion: '4X1 - - 107MM',      cantidad: 1  },
  { codigo: 'ESPECIAL-07',           descripcion: '3X1 - 26MM - 84MM',  cantidad: 2  },
  { codigo: 'EW125.11',              descripcion: '3X1 - - 125MM',      cantidad: 1  },
  { codigo: 'ESPECIAL-08',           descripcion: '4X3 - 32MM - 91MM',  cantidad: 1  },
  { codigo: 'EPO03',                 descripcion: '3X1 - 17MM - 89MM',  cantidad: 3  },
  { codigo: 'EPO88.20/EPO04',        descripcion: '3X1 - 26MM - 88MM',  cantidad: 9  },
  { codigo: 'DELCO REMY 24V/PH1787', descripcion: '3X1 - 21MM - 117MM', cantidad: 1  },
  { codigo: 'EPO04/1',               descripcion: '3X1 - 26MM - 89MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-09',           descripcion: '6X1 - 33MM - 99MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-10',           descripcion: '3X1 - 35MM - 89MM',  cantidad: 1  },
  { codigo: 'ESPECIAL-11',           descripcion: '3X1 - 23MM - 84MM',  cantidad: 1  },
  { codigo: 'EB125.10',              descripcion: '3X4 - 36MM - 125MM', cantidad: 1  },
  { codigo: 'EB089.75',              descripcion: '3X2 - 89MM - 28MM',  cantidad: 1  },
];

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Productos a cargar: ${PRODUCTOS.length}`);
  console.log('');

  let creados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const p of PRODUCTOS) {
    const existente = await prisma.producto.findUnique({ where: { codigo: p.codigo } });

    if (existente) {
      console.log(`  OMITIDO  ${p.codigo} (ya existe, id=${existente.id})`);
      omitidos++;
      continue;
    }

    console.log(`  CREAR    ${p.codigo.padEnd(25)} | ${p.descripcion.padEnd(22)} | stock=${p.cantidad} en ${UBICACION}`);

    if (APPLY) {
      try {
        await prisma.producto.create({
          data: {
            codigo: p.codigo,
            descripcion: p.descripcion,
            stocks: {
              create: {
                ubicacion: UBICACION,
                cantidad: p.cantidad,
              },
            },
          },
        });
        creados++;
      } catch (err) {
        console.error(`  ERROR    ${p.codigo}: ${err.message}`);
        errores++;
      }
    } else {
      creados++;
    }
  }

  console.log('');
  console.log(`Resumen: ${creados} a crear, ${omitidos} omitidos, ${errores} errores`);
  if (!APPLY) {
    console.log('');
    console.log('Ejecuta con --apply para confirmar la carga.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
