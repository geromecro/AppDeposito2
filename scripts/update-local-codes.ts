import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar productos con ubicación Local (modelo legacy)
  const productosLocal = await prisma.productoLegacy.findMany({
    where: { ubicacion: 'Local' }
  })

  console.log(`Encontrados ${productosLocal.length} productos con ubicación 'Local'`)

  if (productosLocal.length === 0) {
    console.log('No hay productos para actualizar.')
    return
  }

  // Actualizar cada producto
  let actualizados = 0
  for (const producto of productosLocal) {
    if (producto.codigo !== producto.descripcion) {
      await prisma.productoLegacy.update({
        where: { id: producto.id },
        data: { codigo: producto.descripcion }
      })
      console.log(`Actualizado ID ${producto.id}: codigo "${producto.codigo}" -> "${producto.descripcion}"`)
      actualizados++
    } else {
      console.log(`ID ${producto.id}: ya tiene codigo igual a descripcion, omitido`)
    }
  }

  console.log(`\nActualización completada: ${actualizados} productos actualizados`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
