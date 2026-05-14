#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const CODIGOS = [
  'EA01-EA073.10','CITROEN','EMI099.10','ESPECIAL-01','EMO091.20',
  'ESPECIAL-02','ESPECIAL-03','ESPECIAL-04','ESPECIAL-05','EA083.20',
  'EB089.63','ENA094.10/ENA01','MOTOROLA','ENA094.21','EA02','ENA03',
  'ESPECIAL-06','EH107.10','ESPECIAL-07','EW125.11','ESPECIAL-08',
  'EPO03','EPO88.20/EPO04','DELCO REMY 24V/PH1787','EPO04/1',
  'ESPECIAL-09','ESPECIAL-10','ESPECIAL-11','EB125.10','EB089.75'
];

async function main() {
  let ok = 0, skip = 0;
  for (const codigo of CODIGOS) {
    const nuevo = 'Estator ' + codigo;
    const prod = await prisma.producto.findUnique({ where: { codigo } });
    if (!prod) { console.log('NO ENCONTRADO:', codigo); skip++; continue; }
    await prisma.producto.update({ where: { id: prod.id }, data: { codigo: nuevo } });
    console.log('OK:', codigo, '->', nuevo);
    ok++;
  }
  console.log('\nActualizados:', ok, '| No encontrados:', skip);
}

main().catch(console.error).finally(() => prisma.$disconnect());
