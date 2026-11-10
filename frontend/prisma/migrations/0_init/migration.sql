-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "hashed_password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "token_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "alembic_version" (
    "version_num" VARCHAR(32) NOT NULL,

    CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "website" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "founded_year" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "cin" VARCHAR(50),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "offices" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255),
    "address" VARCHAR(500),
    "locality" VARCHAR(120),
    "city" VARCHAR(100) NOT NULL DEFAULT 'Bengaluru',
    "state" VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    "postal_code" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "jobs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "office_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "employment_type" VARCHAR(50) NOT NULL DEFAULT 'full-time',
    "experience_level" VARCHAR(50) DEFAULT 'mid',
    "experience_min" INTEGER,
    "experience_max" INTEGER,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "currency" VARCHAR(10) DEFAULT 'INR',
    "skills" VARCHAR(100)[],
    "application_url" VARCHAR(500),
    "job_source_url" VARCHAR(500),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "work_mode" VARCHAR(50) NOT NULL DEFAULT 'in-office',
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "posted_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_sources" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "source_name" VARCHAR(100) NOT NULL,
    "source_url" VARCHAR(500) NOT NULL,
    "last_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ix_admin_users_username" ON "admin_users"("username");
CREATE INDEX IF NOT EXISTS "ix_admin_users_id" ON "admin_users"("id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ix_companies_slug" ON "companies"("slug");
CREATE INDEX IF NOT EXISTS "ix_companies_id" ON "companies"("id");
CREATE INDEX IF NOT EXISTS "ix_companies_name" ON "companies"("name");
CREATE INDEX IF NOT EXISTS "ix_companies_industry" ON "companies"("industry");
CREATE INDEX IF NOT EXISTS "ix_companies_is_verified" ON "companies"("is_verified");
CREATE INDEX IF NOT EXISTS "ix_companies_cin" ON "companies"("cin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_offices_id" ON "offices"("id");
CREATE INDEX IF NOT EXISTS "ix_offices_company_id" ON "offices"("company_id");
CREATE INDEX IF NOT EXISTS "ix_offices_locality" ON "offices"("locality");
CREATE INDEX IF NOT EXISTS "ix_offices_city" ON "offices"("city");
CREATE INDEX IF NOT EXISTS "ix_offices_postal_code" ON "offices"("postal_code");
CREATE INDEX IF NOT EXISTS "idx_offices_lat_lng" ON "offices"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ix_jobs_slug" ON "jobs"("slug");
CREATE INDEX IF NOT EXISTS "ix_jobs_id" ON "jobs"("id");
CREATE INDEX IF NOT EXISTS "ix_jobs_company_id" ON "jobs"("company_id");
CREATE INDEX IF NOT EXISTS "ix_jobs_office_id" ON "jobs"("office_id");
CREATE INDEX IF NOT EXISTS "ix_jobs_title" ON "jobs"("title");
CREATE INDEX IF NOT EXISTS "ix_jobs_employment_type" ON "jobs"("employment_type");
CREATE INDEX IF NOT EXISTS "ix_jobs_experience_level" ON "jobs"("experience_level");
CREATE INDEX IF NOT EXISTS "ix_jobs_status" ON "jobs"("status");
CREATE INDEX IF NOT EXISTS "ix_jobs_work_mode" ON "jobs"("work_mode");
CREATE INDEX IF NOT EXISTS "ix_jobs_posted_at" ON "jobs"("posted_at");
CREATE INDEX IF NOT EXISTS "ix_jobs_expires_at" ON "jobs"("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_jobs_company_title_office" ON "jobs"("company_id", "title", "office_id");

-- Partial Unique Index for Remote Jobs
CREATE UNIQUE INDEX IF NOT EXISTS "uq_jobs_company_title_remote" ON "jobs"("company_id", "title") WHERE "office_id" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_job_sources_id" ON "job_sources"("id");
CREATE INDEX IF NOT EXISTS "ix_job_sources_job_id" ON "job_sources"("job_id");
CREATE INDEX IF NOT EXISTS "ix_job_sources_source_name" ON "job_sources"("source_name");
CREATE INDEX IF NOT EXISTS "ix_job_sources_last_verified_at" ON "job_sources"("last_verified_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_job_sources_job_source_url" ON "job_sources"("job_id", "source_url");

-- Check Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_jobs_salary_min_max') THEN
        ALTER TABLE "jobs" ADD CONSTRAINT "check_jobs_salary_min_max" CHECK (("salary_min" IS NULL) OR ("salary_max" IS NULL) OR ("salary_min" <= "salary_max"));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_office_latitude_range') THEN
        ALTER TABLE "offices" ADD CONSTRAINT "check_office_latitude_range" CHECK (("latitude" IS NULL) OR (("latitude" >= (-90.0)::double precision) AND ("latitude" <= (90.0)::double precision)));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_office_longitude_range') THEN
        ALTER TABLE "offices" ADD CONSTRAINT "check_office_longitude_range" CHECK (("longitude" IS NULL) OR (("longitude" >= (-180.0)::double precision) AND ("longitude" <= (180.0)::double precision)));
    END IF;
END $$;
