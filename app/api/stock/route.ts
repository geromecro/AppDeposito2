import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';

const DB_TRANSLATE_FROM =
  '\u00e1\u00e0\u00e4\u00e2\u00e3\u00e9\u00e8\u00eb\u00ea\u00ed\u00ec\u00ef\u00ee\u00f3\u00f2\u00f6\u00f4\u00f5\u00fa\u00f9\u00fc\u00fb\u00f1\u00e7';
const DB_TRANSLATE_TO = 'aaaaaeeeeiiiiooooouuuunc';

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function getSearchScore(
  producto: { codigo: string; descripcion: string },
  normalizedSearch: string,
  searchTerms: string[]
) {
  if (!normalizedSearch) {
    return 0;
  }

  const normalizedCode = normalizeSearchValue(producto.codigo);
  const normalizedDescription = normalizeSearchValue(producto.descripcion);
  let score = 0;

  if (normalizedCode === normalizedSearch) {
    score += 1000;
  } else if (normalizedCode.startsWith(normalizedSearch)) {
    score += 700;
  } else if (normalizedCode.includes(normalizedSearch)) {
    score += 400;
  }

  if (normalizedDescription === normalizedSearch) {
    score += 320;
  } else if (normalizedDescription.startsWith(normalizedSearch)) {
    score += 180;
  } else if (normalizedDescription.includes(normalizedSearch)) {
    score += 80;
  }

  for (const term of searchTerms) {
    if (normalizedCode.startsWith(term)) {
      score += 90;
    } else if (normalizedCode.includes(term)) {
      score += 50;
    }

    if (normalizedDescription.startsWith(term)) {
      score += 30;
    } else if (normalizedDescription.includes(term)) {
      score += 15;
    }
  }

  return score;
}

function getStockFilterSql(ubicacion: string, sinStock: boolean) {
  if (ubicacion === 'Deposito') {
    return Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "Stock" s
        WHERE s."productoId" = p."id"
          AND s."ubicacion" = 'Deposito'
          AND s."cantidad" > 0
      )
    `;
  }

  if (ubicacion === 'Local') {
    return Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "Stock" s
        WHERE s."productoId" = p."id"
          AND s."ubicacion" = 'Local'
          AND s."cantidad" > 0
      )
    `;
  }

  if (sinStock) {
    return Prisma.sql`
      NOT EXISTS (
        SELECT 1
        FROM "Stock" s
        WHERE s."productoId" = p."id"
          AND s."cantidad" > 0
      )
    `;
  }

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM "Stock" s
      WHERE s."productoId" = p."id"
        AND s."cantidad" > 0
    )
  `;
}

function combineWithAnd(clauses: Prisma.Sql[]) {
  if (clauses.length === 0) {
    return Prisma.sql`TRUE`;
  }

  return clauses.slice(1).reduce(
    (acc, clause) => Prisma.sql`${acc} AND ${clause}`,
    clauses[0]
  );
}

// GET - Obtener stock consolidado
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const ubicacion = searchParams.get('ubicacion') || '';
    const sinStock = searchParams.get('sinStock') === 'true';
    const normalizedSearch = normalizeSearchValue(search);
    const normalizedSearchTerms = normalizedSearch ? normalizedSearch.split(' ') : [];

    const whereClause: Prisma.ProductoWhereInput = {};

    if (normalizedSearchTerms.length > 0) {
      const searchClauses = normalizedSearchTerms.map((term) => {
        const pattern = `%${term}%`;

        return Prisma.sql`
          (
            translate(lower(p."codigo"), ${DB_TRANSLATE_FROM}, ${DB_TRANSLATE_TO}) LIKE ${pattern}
            OR translate(lower(p."descripcion"), ${DB_TRANSLATE_FROM}, ${DB_TRANSLATE_TO}) LIKE ${pattern}
          )
        `;
      });

      const matchingProducts = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT p."id"
        FROM "ProductoCatalogo" p
        WHERE ${combineWithAnd([...searchClauses, getStockFilterSql(ubicacion, sinStock)])}
      `);

      const matchingProductIds = matchingProducts.map((producto) => producto.id);

      if (matchingProductIds.length === 0) {
        return NextResponse.json({
          stock: [],
          totales: {
            productos: 0,
            unidadesDeposito: 0,
            unidadesLocal: 0,
            unidadesTotal: 0,
          },
        });
      }

      whereClause.id = {
        in: matchingProductIds,
      };
    }

    if (ubicacion === 'Deposito') {
      whereClause.stocks = {
        some: {
          ubicacion: 'Deposito',
          cantidad: { gt: 0 },
        },
      };
    } else if (ubicacion === 'Local') {
      whereClause.stocks = {
        some: {
          ubicacion: 'Local',
          cantidad: { gt: 0 },
        },
      };
    } else if (sinStock) {
      whereClause.stocks = {
        none: {
          cantidad: { gt: 0 },
        },
      };
    } else {
      whereClause.stocks = {
        some: {
          cantidad: { gt: 0 },
        },
      };
    }

    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        fotoUrl: true,
        updatedAt: true,
        stocks: {
          where: {
            ubicacion: {
              in: ['Deposito', 'Local'],
            },
          },
          select: {
            ubicacion: true,
            cantidad: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totales = {
      productos: 0,
      unidadesDeposito: 0,
      unidadesLocal: 0,
      unidadesTotal: 0,
    };

    const stockConsolidado = productos.map((producto) => {
      const stockDeposito = producto.stocks.find((stock) => stock.ubicacion === 'Deposito')?.cantidad || 0;
      const stockLocal = producto.stocks.find((stock) => stock.ubicacion === 'Local')?.cantidad || 0;
      const total = stockDeposito + stockLocal;

      totales.productos += 1;
      totales.unidadesDeposito += stockDeposito;
      totales.unidadesLocal += stockLocal;
      totales.unidadesTotal += total;

      return {
        producto: {
          id: producto.id,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          fotoUrl: producto.fotoUrl,
        },
        stockDeposito,
        stockLocal,
        total,
        updatedAt: producto.updatedAt,
        searchScore: getSearchScore(producto, normalizedSearch, normalizedSearchTerms),
      };
    });

    if (normalizedSearchTerms.length > 0) {
      stockConsolidado.sort((a, b) => {
        if (b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }

        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
    }

    return NextResponse.json({
      stock: stockConsolidado.map(({ updatedAt: _updatedAt, searchScore: _searchScore, ...item }) => item),
      totales,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { error: 'Error al obtener stock' },
      { status: 500 }
    );
  }
}
