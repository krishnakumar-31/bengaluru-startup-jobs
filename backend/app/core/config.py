import os
from pathlib import Path
from typing import List, Union
import urllib.parse
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory to find .env reliably regardless of current working directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Bengaluru Startup Jobs Map API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS settings - list of allowed origins (e.g. Next.js dev server)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Admin & Authentication settings
    ADMIN_USERNAME: str = "admin"
    ADMIN_INITIAL_PASSWORD: str = "618816"
    ADMIN_JWT_SECRET: str = "bengaluru-startup-jobs-admin-secret-key-super-secure-jwt-token"
    ADMIN_JWT_ALGORITHM: str = "HS256"
    ADMIN_JWT_EXPIRE_MINUTES: int = 480
    ADMIN_COOKIE_NAME: str = "admin_session"
    ADMIN_CSRF_COOKIE_NAME: str = "admin_csrf"
    ADMIN_COOKIE_SECURE: bool = False
    ADMIN_COOKIE_SAMESITE: str = "lax"

    # Database settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "bengaluru_jobs"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: Union[str, None] = None

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Union[str, None], info) -> str:
        if isinstance(v, str) and v.strip():
            return v
        data = info.data
        user = urllib.parse.quote_plus(str(data.get("POSTGRES_USER", "postgres")))
        pwd = urllib.parse.quote_plus(str(data.get("POSTGRES_PASSWORD", "postgres")))
        server = data.get("POSTGRES_SERVER", "localhost")
        port = data.get("POSTGRES_PORT", "5432")
        db = data.get("POSTGRES_DB", "bengaluru_jobs")
        return f"postgresql+psycopg2://{user}:{pwd}@{server}:{port}/{db}"

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
