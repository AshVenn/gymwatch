# GymWatch

GymWatch is a multi-tenant gym management platform built with Next.js. It provides dashboards for gym teams and super admins to manage members, classes, subscriptions, access control, and reporting (Excel/PDF exports).

## Features
- Member lifecycle: registration, subscription management, attendance and visit history.
- Access control: QR verification, access events, retention and purge tooling.
- Class scheduling: create classes, bookings, attendance tracking, and weekly calendar views.
- Analytics and reports: dashboards for usage, plans, and exports (Excel/PDF).
- Super admin console: manage gyms, teams, plan settings, demo requests, and variants.
- Theming and UI: Radix-based components, charts, QR scanner, and responsive layouts.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma ORM with PostgreSQL
- NextAuth for authentication
- TanStack Query for data fetching and caching
- Tailwind CSS 4 + Radix UI + Recharts

## Getting Started
### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or hosted, e.g., Neon)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` (or create new) to `.env.local` and fill values (see Environment below).
3. Apply migrations and seed:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   App runs at http://localhost:3000.

### Scripts
- `npm run dev` – start development server
- `npm run build` – create production build
- `npm run start` – run built app
- `npm run lint` – lint codebase

## Environment
The app expects these variables (values omitted for safety):
```
DATABASE_URL=
PRISMA_DATABASE_URL=
POSTGRES_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
VERCEL_OIDC_TOKEN=
```
At minimum, set `DATABASE_URL` and `NEXTAUTH_SECRET`; keep `NEXTAUTH_URL` aligned with your site URL.

## Database
- Migrations live in `prisma/migrations`.
- Seed script: `prisma/seed.js` (invoked via `npx prisma db seed`).

## Key Paths
- UI: `components/` (dashboard, superadmin, marketing, ui primitives)
- App routes: `app/` (dashboards, auth, APIs)
- APIs: `app/api/*` (access events, classes, reports, gyms, subscriptions, variants, etc.)
- Prisma schema: `prisma/schema.prisma`

## Deployment
- Build with `npm run build` and serve with `npm start`.
- Add production env vars to your hosting provider (e.g., Vercel) before deploying.
