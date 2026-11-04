# Bengaluru Startup Jobs Map - System Architecture

## 1. High-Level Overview

**Bengaluru Startup Jobs Map** is a geo-centric job discovery platform focused on Bengaluru's vibrant tech ecosystem. The platform allows job seekers to visualize tech hubs (e.g. Koramangala, Indiranagar, HSR Layout, Whitefield, Outer Ring Road/Bellandur) on an interactive map and explore matching roles.

```
┌────────────────────────────────────────────────────────┐
│               Frontend: Next.js 16 (App Router)        │
│                                                        │
│  ┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│  │ Hero & Search  │ │  Leaflet Map   │ │ Job Listings│ │
│  │    Section     │ │  Placeholder   │ │ (Sample Data│ │
│  └────────────────┘ └────────────────┘ └─────────────┘ │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (CORS Enabled)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend: FastAPI (Python 3.11)           │
│                                                        │
│  ┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│  │ /api/v1/health │ │  /api/v1/jobs  │ │/companies   │ │
│  └────────────────┘ └────────────────┘ └─────────────┘ │
│                           │                            │
│  ┌────────────────────────┴──────────────────────────┐ │
│  │ Services Layer (JobService, CompanyService)       │ │
│  └────────────────────────┬──────────────────────────┘ │
│  ┌────────────────────────┴──────────────────────────┐ │
│  │ Repositories Layer (JobRepository, etc.)          │ │
│  └────────────────────────┬──────────────────────────┘ │
│  ┌────────────────────────┴──────────────────────────┐ │
│  │ SQLAlchemy 2.0 ORM & Alembic Migrations           │ │
│  └────────────────────────┬──────────────────────────┘ │
└───────────────────────────┼────────────────────────────┘
                            │ (Future Phase)
                            ▼
┌────────────────────────────────────────────────────────┐
│              PostgreSQL (Optional PostGIS)             │
│   - companies (coordinates, locality, metadata)        │
│   - jobs (roles, tags, experience, status)             │
└────────────────────────────────────────────────────────┘
```

## 2. Frontend Layer (Next.js 16)
- **App Router (`src/app`)**: Server and client component separation.
- **Styling**: Tailwind CSS v4 with modern emerald/indigo palette.
- **Icons**: `lucide-react`.
- **Geographic Visuals**: Leaflet and React Leaflet configured for client-side dynamic rendering (`ssr: false`) to avoid server/browser DOM mismatches.
- **State Flow**: Search filters (role, startup, hub locality, work mode) synchronize between the filter bar, map pins, and list cards.

## 3. Backend Layer (FastAPI)
- **Modularity**: Strict separation between API routes (`app/api/`), schemas (`app/schemas/`), database models (`app/models/`), business logic (`app/services/`), and data access (`app/repositories/`).
- **Resilience**: Engine connections are initiated lazily. The health check (`GET /api/v1/health`) executes reliably without requiring a running database.
- **Validation**: Pydantic v2 schemas enforce strict input/output contracts.
- **Database Evolution**: Alembic migration scripts track schema versions cleanly.
