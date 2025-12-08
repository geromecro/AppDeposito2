# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**App Depósito** is a mobile-first inventory transfer tracking application. Vendors (vendedores) log products being transferred between locations, with optional photo capture. The app tracks quantities, provides search functionality, and generates statistics per vendor.

## Quick Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (runs prisma generate first)
npm run prisma:migrate   # Push schema changes to database
npm run prisma:studio    # Open Prisma Studio GUI for database
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 with custom theme colors
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **File Storage**: Supabase Storage (bucket: `productos-fotos`)
- **State**: React hooks + localStorage for vendor session

### Data Model

Single model in `prisma/schema.prisma`:

```
Producto {
  id, codigo, descripcion, cantidad, fotoUrl?, vendedor, createdAt, updatedAt
}
```

### Page Structure

```
app/
├── page.tsx                    # Login - vendor selection (stored in localStorage)
├── transferencias/
│   ├── page.tsx               # Main list - search, edit/delete modals
│   └── nueva/page.tsx         # Add product form with photo capture
├── resumen/page.tsx           # Statistics dashboard by vendor
└── api/
    ├── productos/             # CRUD operations
    │   ├── route.ts           # GET (list+search), POST (create)
    │   └── [id]/route.ts      # GET, PUT, DELETE
    ├── upload/route.ts        # Photo upload to Supabase Storage
    └── stats/route.ts         # Aggregate statistics
```

### Key Patterns

**Vendor Authentication**: Simple localStorage-based session. Vendor name selected on login, stored client-side, used to filter/tag data.

**API Routes with Dynamic Params** (Next.js 15):
```typescript
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id);
}
```

**Prisma Singleton** (`lib/prisma.ts`): Prevents connection pool exhaustion in serverless.

**Photo Upload Flow**: Client captures → FormData to `/api/upload` → Supabase Storage → public URL stored in Producto.

### Design System

Custom Tailwind v4 theme in `globals.css` using `@theme` directive:
- `primary-*`: Gray scale (50-900) for text/backgrounds
- `accent-*`: Green for success states
- `warning-*`: Amber for warnings
- `error-*`: Red for destructive actions

Reusable components in `/components`:
- `Button`: 4 variants (primary, secondary, ghost, danger), 3 sizes, loading state
- `Card`, `CardHeader`, `CardBody`: Surface containers
- `Input`: Form input with label
- `SearchBar`: Search input component
- `ProductoCard`: Product display with edit/delete actions

## Environment Variables

Required in `.env` or Vercel dashboard:
```
DATABASE_URL=postgresql://...         # Supabase PostgreSQL connection string
NEXT_PUBLIC_SUPABASE_URL=https://...  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # Supabase anon/public key
```

## Vendor List

Defined in `lib/constants.ts`:
```typescript
export const VENDEDORES = ['Geronimo', 'Mateo', 'Rodrigo', 'Alexander', 'Alejandro', 'Emanuel', 'Nicolas'];
```
