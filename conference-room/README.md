# Conference Room

Shared weekly timetable for booking a conference room across Nilo, First Plug, and Volantis.

## Features

- Weekly schedule with 15-minute slots from 8:00 to 18:00 (Buenos Aires time)
- Real-time bookings synced through Convex
- Local-only mode for frontend development without a backend
- Recurring bookings with preview (weekly, biweekly, and fixed ranges)
- Drag to move bookings and resize them across slots
- Live "now" indicator on the current day

## Stack

- Next.js 16 (App Router)
- Convex
- Tailwind CSS 4 + shadcn/ui
- TypeScript

## Getting started

Install dependencies:

```bash
npm install
```

### With Convex (recommended)

Copy the example env file and start the dev server:

```bash
cp .env.example .env.local
npm run dev
```

`npm run dev` runs `convex dev` and Next.js together. Convex writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` to `.env.local` on first run.

### Local-only mode

Leave `NEXT_PUBLIC_CONVEX_URL` unset in `.env.local`, then run:

```bash
npm run dev:frontend
```

Bookings are stored in memory for the session and are not shared between browsers.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Convex + Next.js |
| `npm run dev:frontend` | Start Next.js only |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript |
| `npm run format` | Format with Prettier |

## Deployment

Production deploys use Vercel with Convex. Set `CONVEX_DEPLOY_KEY` in Vercel from the Convex dashboard (Settings → Deploy Key). The build runs:

```bash
npx convex deploy --cmd 'npm run build'
```

## Project layout

```text
app/           Next.js routes
components/    UI and timetable
convex/        Backend schema, queries, and mutations
hooks/         Client hooks (local bookings, slot metrics)
lib/           Time slots, recurrence, timezone helpers
```
