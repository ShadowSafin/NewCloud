# AGENTS.md - CloudStore Development Guide

## Quick Start

```bash
# Start full stack with Docker (includes DB migrations, Redis, worker)
docker compose up -d

# Manual dev setup
# Backend
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run dev
# Frontend  
cd frontend && npm install && echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local && npm run dev
```

## Commands

| Component | Command | Description |
|-----------|---------|-------------|
| All | `docker compose up -d` | Start all services |
| Backend | `npm run dev` | ts-node-dev with hot reload |
| Backend | `npm run build` | TypeScript compilation |
| Backend | `npm run db:migrate` | Prisma migration |
| Backend | `npm run db:generate` | Prisma client generation |
| Backend | `npm run lint` | ESLint |
| Backend | `npm run typecheck` | TypeScript check |
| Worker | `npm run worker` | Background job processor |
| Frontend | `npm run dev` | Next.js dev server (port 3000) |
| Frontend | `npm run build` | Next.js production build |
| Frontend | `npm run lint` | Next.js lint |
| Frontend | `npm run typecheck` | TypeScript check |

## Architecture

- **Monorepo**: `backend/` and `frontend/` directories
- **Backend entrypoint**: `backend/src/server.ts`
- **Worker entrypoint**: `backend/src/worker.ts`
- **Database**: Prisma ORM with PostgreSQL (schema: `backend/prisma/schema.prisma`)
- **Cache**: Redis (container: `cloud-redis`, port 6379)
- **Storage**: Local filesystem at `./data/storage/users/{user-id}/` (mounted to `/app/data`)
- **Authentication**: JWT access tokens (15m) + refresh tokens (7d)
- **File Types**: Universal file type detection with 15+ categories (images, video, code, etc.)

## Important Notes

- Backend runs on port **4000** (not 3000 - that's frontend)
- Docker compose auto-runs `npx prisma db push` on backend container start
- File uploads max size: 1TB (configurable via `MAX_FILE_SIZE`)
- Storage root: `/app/data/storage` (set via `STORAGE_ROOT` env)
- Frontend requires `NEXT_PUBLIC_API_URL` in `.env.local` pointing to backend
- Prisma studio: `npm run db:studio` from backend directory
- **Worker container** processes thumbnails in background using Sharp
- **Redis** is used for job queues and caching

## Docker Services

Running containers:
- `cloud-frontend` - Next.js 15 (port 3000)
- `cloud-backend` - Express API (port 4000)
- `cloud-postgres` - PostgreSQL (port 5433)
- `cloud-redis` - Redis (port 6379)
- `cloud-worker` - Background job processor

Volumes:
- `./data:/app/data` - User files and thumbnails (persistent)
- `postgres_data` - Database files