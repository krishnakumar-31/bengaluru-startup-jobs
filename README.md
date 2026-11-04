# Bengaluru Startup Jobs Map

> A geo-centric startup and career discovery platform across Bengaluru, Karnataka, India. Inspired by the BLR tech ecosystem.

---

## 1. Project Overview

**Bengaluru Startup Jobs Map** connects engineers, designers, product managers, and founders with tech companies across Bengaluru's high-density corridors:

- **Koramangala** — Early-stage startups, VC hubs, and founder cafes.
- **HSR Layout** — Unicorn corridor, AI/ML research labs, and quick commerce.
- **Indiranagar** — Direct-to-consumer (D2C), design-led tech, and product studios.
- **Outer Ring Road (ORR) / Bellandur** — Global technology centers, enterprise SaaS, and cloud infra.
- **Whitefield** — Enterprise tech parks, hardware R&D, and semiconductor labs.
- **Electronic City** — Embedded systems, automotive tech, and hardware innovation.

The project features a **Next.js 16 (App Router)** interactive web client and a decoupled **FastAPI (Python 3.11)** backend with SQLAlchemy ORM and Alembic migrations.

---

## 2. Repository Structure

```
bengaluru-startup-jobs/
├── frontend/                     # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/                  # App Router pages, layout, and global styling
│   │   ├── components/           # Navbar, HeroSearch, MapPlaceholder, JobListings, Footer
│   │   ├── lib/                  # Sample datasets and utilities
│   │   └── types/                # TypeScript domain models
│   ├── public/                   # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/v1/               # Health, jobs, and companies router
│   │   ├── core/                 # Pydantic Settings and CORS configuration
│   │   ├── db/                   # SQLAlchemy engine, session maker, Base declarative
│   │   ├── models/               # Company and Job ORM models
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   ├── services/             # Business logic layer
│   │   ├── repositories/         # Data access layer
│   │   └── main.py               # FastAPI entrypoint
│   ├── alembic/                  # Database migration configuration
│   ├── tests/                    # Backend automated tests (health check, etc.)
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Alembic configuration file
│   └── .env.example              # Backend environment template
│
├── data/                         # Geo-JSON boundaries and seed datasets
│   └── README.md
├── docs/                         # Technical documentation & guides
│   ├── architecture.md           # System architecture overview
│   └── python-setup.md           # Detailed Windows Python venv guide
├── .env.example                  # Root environment template
├── .gitignore                    # Git ignore specifications
└── README.md                     # Project documentation (this file)
```

---

## 3. Windows Setup & Quick Start

Both applications run independently without Docker.

### Prerequisites
- **Node.js**: v18.17+ or v20+ / v22+ / v24+
- **Python**: 3.10+ (Python 3.11 recommended)
- **PowerShell** or **Command Prompt (CMD)**

---

### Step A: Backend Setup (FastAPI)

1. Open PowerShell and navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *(If PowerShell execution policy blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

3. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. Verify backend operation:
   - **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
   - **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
   - **Alternative Docs (ReDoc)**: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)

6. Run backend automated tests:
   ```powershell
   pytest
   ```

---

### Step B: Frontend Setup (Next.js 16)

1. Open a new terminal and navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```

3. Start the Next.js development server:
   ```powershell
   npm run dev
   ```

4. Open the application in your browser:
   - **Landing Page**: [http://localhost:3000](http://localhost:3000)

5. Build for production:
   ```powershell
   npm run build
   ```

---

## 4. Current Phase Status & Important Notes

- **Database Connection**: Database connection settings are pre-configured with safe defaults. PostgreSQL is **not required** to run the initial application or pass health checks.
- **Alembic Migrations**: Migration environment files (`alembic/`) and configuration (`alembic.ini`) are prepared. Migrations have **not** been executed yet.
- **Sample Data**: All startups, positions, and salary ranges currently displayed in the frontend are explicitly tagged **Demo/Sample** placeholders. Real companies and proprietary listings will be populated in subsequent phases.
- **Interactive Map**: A responsive, styled map section placeholder is established with corridor filtering chips. Leaflet and React Leaflet packages are installed and prepared for dynamic tile layers and cluster markers in Phase 2.

---

## 5. Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet & React Leaflet.
- **Backend**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn, Pytest.
- **Database (Phase 2+)**: PostgreSQL / PostGIS.
