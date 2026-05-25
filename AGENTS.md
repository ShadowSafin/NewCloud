# AGENTS.md - NewCloud Development Guide

## Quick Start

```bash
# Deploy directly from GitHub on Linux/NAS/macOS.
curl -fsSL https://raw.githubusercontent.com/ShadowSafin/NewCloud/main/install.sh | sh

# Secure first deployment from an existing checkout.
bash setup.sh

# Repeat Linux/NAS startup after configuration exists.
sh start.sh

# Windows equivalents.
setup.bat
start.bat
```

```powershell
# Deploy directly from GitHub on Windows.
irm https://raw.githubusercontent.com/ShadowSafin/NewCloud/main/install.ps1 | iex
```

## Commands

| Component | Command | Description |
| --------- | ------- | ----------- |
| All | GitHub `install.sh` / `install.ps1` one-liner | Clone and secure first deployment |
| All | `bash setup.sh` / `setup.bat` | Secure deployment from an existing checkout |
| All | `sh start.sh` / `start.bat` | Validated repeat startup |
| All | `sh update.sh` | PostgreSQL dump, Git fast-forward, migration-safe rebuild |
| All | `docker compose logs -f backend worker` | Inspect runtime/worker logs |
| Backend | `npm run dev` | `ts-node-dev` with hot reload |
| Backend | `npm run build` | TypeScript compilation |
| Backend | `npm run db:migrate` | Prisma development migration |
| Backend | `npm run db:generate` | Prisma client generation |
| Backend | `npm run lint` | ESLint |
| Backend | `npm run typecheck` | TypeScript check |
| Worker | `npm run worker` | Background job processor |
| Frontend | `npm run dev` | Next.js dev server on port `3000` |
| Frontend | `npm run build` | Next.js production build |
| Frontend | `npm run lint` | Next.js lint |
| Frontend | `npm run typecheck` | TypeScript check |

## Architecture

- **Monorepo**: `backend/` and `frontend/`
- **Backend entrypoint**: `backend/src/server.ts`
- **Worker entrypoint**: `backend/src/worker.ts`
- **Database**: Prisma ORM with PostgreSQL; schema in `backend/prisma/schema.prisma`
- **Queues**: Redis and BullMQ on an internal Compose network
- **Storage**: Content-addressed blobs and derived media under `./data/storage`, mounted to `/app/data`
- **Authentication**: JWT access tokens plus rotating persisted refresh tokens
- **Deployment**: Five Compose services with health checks and migration-driven backend startup

## Important Notes

- Frontend is published on port `3000`; backend API is published on port `4000`.
- Production startup uses `backend/scripts/deploy-migrations.sh`: normal Prisma migrations plus a guarded additive baseline for former schema-push installs. Never introduce destructive `db push` startup commands.
- Setup generates strong `DB_PASSWORD`, JWT, media-signing, and Bull Board secrets; production rejects weak values.
- File upload ceilings are configurable through `MAX_FILE_SIZE` and `MAX_UPLOAD_CHUNK_SIZE`.
- Deployment defaults block dangerous uploads with `BLOCK_DANGEROUS_UPLOADS=true`.
- PostgreSQL and Redis are not host-published in the production Compose stack.
- The backend readiness probe is `/health/ready`; frontend health is `/health`.

## Docker Services

| Service | Role | Persistence |
| ------- | ---- | ----------- |
| `frontend` | Next.js interface and same-origin API proxy | None |
| `backend` | Express API, signed media streaming, health, WebSocket endpoint | `${NEWCLOUD_DATA_DIR:-./data}:/app/data` |
| `worker` | Background uploads, thumbnail, and integrity workers | `${NEWCLOUD_DATA_DIR:-./data}:/app/data` |
| `postgres` | Transactional metadata | `${COMPOSE_PROJECT_NAME}_postgres_data` |
| `redis` | Queues and event transport | `${COMPOSE_PROJECT_NAME}_redis_data` |
