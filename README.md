# CloudStore - Self-Hosted Cloud Storage Platform

A modern, fast, and scalable self-hosted cloud storage platform similar to Google Drive, built with Next.js 15, Express, PostgreSQL, and Docker.

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS
- **ShadCN UI** - Modern accessible components
- **Zustand** - Lightweight state management
- **Axios** - HTTP client with interceptors

### Backend
- **Node.js + Express** - REST API server
- **TypeScript** - Type-safe development
- **Prisma** - Modern ORM for PostgreSQL
- **JWT + Refresh Tokens** - Secure authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **Zod** - Request validation

### Infrastructure
- **PostgreSQL** - Relational database
- **Redis** - Caching and background jobs
- **Docker + Docker Compose** - Containerization
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Sharp** - Image optimization and thumbnails
- **Worker Service** - Background job processing

## Features

### Authentication
- User registration & login
- JWT access tokens with automatic refresh
- Password hashing with bcrypt
- Protected API routes
- Session persistence (stays logged in on refresh)

### File Management
- Secure file uploads with drag & drop
- Upload progress tracking
- Download files
- Rename & delete files
- Duplicate filename handling
- File type validation & security restrictions
- MIME type detection
- **File size limits: 1TB** (configurable)

### File Preview System
- **Images**: PNG, JPG, JPEG, WEBP, GIF, SVG - direct preview
- **PDF**: In-app PDF viewer
- **Text/Code**: Code syntax highlighting
- **Video**: Streaming playback with seeking
- **Audio**: Streaming playback
- Modal-based preview UI
- Next/Previous navigation

### File Sharing
- Generate public share links
- Expiring share links
- Password-protected shares
- Share management (view/delete)
- Copy share link button

### Media Streaming
- HTTP range requests for seeking
- Partial content streaming
- Video & audio playback
- Optimized for large files

### Search & Sorting
- Real-time file search
- Sort by: name, date, size, type
- Ascending/Descending order

### Folder System
- Create folders
- Nested folder support
- Navigate folder hierarchy
- Breadcrumb navigation
- Rename & delete folders (with recursive cleanup)

### Dashboard UI
- Google Drive-inspired modern interface
- Grid & list view toggle
- Drag & drop uploads
- Upload progress indicator
- Search functionality
- Responsive design
- Dark / light mode support

## Project Structure

```
.
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment template
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── config/             # Configuration
│       ├── controllers/        # HTTP handlers
│       ├── middleware/         # Auth, validation, errors, uploads
│       ├── routes/             # API routes
│       ├── services/           # Business logic
│       ├── types/              # TypeScript types
│       ├── utils/              # Utilities & errors
│       └── server.ts           # Entry point
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── app/                # Next.js App Router pages
        ├── components/
        │   ├── ui/             # ShadCN UI components
        │   ├── layout/         # Layout components
        │   └── file/           # File management components
        ├── hooks/              # Custom React hooks
        ├── lib/                # Utilities & API client
        └── store/              # Zustand stores
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Make (optional)

### One-Command Startup

```bash
# Clone the repository
git clone <repo-url>
cd cloudstore

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Or with logs
docker compose up
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database**: localhost:5433
- **Redis**: localhost:6379

### First-Time Setup

After starting the containers, the backend will automatically run Prisma migrations. You can then:

1. Visit http://localhost:3000
2. Create an account at `/register`
3. Start uploading files!

## Docker Services

The platform runs 5 services via Docker Compose:
- **cloud-frontend** - Next.js 15 (port 3000)
- **cloud-backend** - Express API (port 4000)
- **cloud-postgres** - PostgreSQL (port 5433)
- **cloud-redis** - Redis for caching/jobs (port 6379)
- **cloud-worker** - Background job processor

## Development

### Backend Development

```bash
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install

# Set up environment
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

# Start dev server
npm run dev
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/files/upload | Upload single file |
| POST | /api/files/upload-multiple | Upload multiple files |
| GET | /api/files | List files |
| GET | /api/files/:id | Get file metadata |
| GET | /api/files/:id/download | Download file |
| GET | /api/files/:id/stream | Stream media file |
| PATCH | /api/files/:id | Rename file |
| PATCH | /api/files/:id/favorite | Toggle favorite |
| DELETE | /api/files/:id | Delete file |
| GET | /api/files/recent | Get recent files |
| GET | /api/files/favorites | Get favorite files |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/folders | Create folder |
| GET | /api/folders | List folders |
| GET | /api/folders/tree | Get folder tree |
| GET | /api/folders/:id/breadcrumb | Get breadcrumb |
| PATCH | /api/folders/:id | Rename folder |
| DELETE | /api/folders/:id | Delete folder |

### Shares
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/shares | Create share link |
| GET | /api/shares/file/:fileId | Get file shares |
| DELETE | /api/shares/:id | Delete share |

## Environment Variables

### Required
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Required |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 4000 |
| `NODE_ENV` | Environment mode | development |
| `JWT_EXPIRATION` | Access token expiration | 15m |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | 7d |
| `STORAGE_ROOT` | File storage root directory | /app/data/storage |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 1099511627776 (1TB) |
| `FRONTEND_URL` | CORS allowed origin | http://localhost:3000 |

## Security Features

- JWT authentication with automatic refresh
- Password hashing with bcrypt (12 rounds)
- File type validation and dangerous file blocking
- SQL injection protection via Prisma ORM
- Input sanitization with Zod validation
- Rate limiting on API endpoints
- Security headers via Helmet
- CORS configuration
- User-isolated file storage

## Database Schema

### Users
- `id` (UUID, PK)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `avatar`
- `created_at`, `updated_at`

### Folders
- `id` (UUID, PK)
- `user_id` (FK)
- `parent_id` (Self-referencing FK)
- `name`
- `created_at`

### Files
- `id` (UUID, PK)
- `user_id` (FK)
- `folder_id` (FK)
- `original_name`
- `stored_name` (Unique)
- `path`
- `mime_type`
- `size`
- `created_at`

### Refresh Tokens
- `id` (UUID, PK)
- `token` (Unique)
- `user_id` (FK)
- `expires_at`
- `created_at`

## Storage Structure

```
data/
└── storage/
    └── users/
        └── {user-id}/
            ├── files/
            ├── folders/
            └── thumbnails/
```

**Note:** The `./data` directory is mounted to `/app/data` in the container and persists across restarts.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Roadmap

- [ ] File sharing / public links
- [ ] File versioning
- [ ] Trash / recycle bin
- [ ] Storage quotas
- [ ] File preview (images, PDFs)
- [ ] Real-time sync via WebSockets
- [ ] Mobile app
- [ ] Multi-user collaboration
