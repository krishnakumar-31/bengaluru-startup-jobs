from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Engine configured with pool_pre_ping=True
# Note: Connections are opened lazily upon actual query execution,
# allowing the application and health check to run even before PostgreSQL is configured.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides an SQLAlchemy session for requests that require database access."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
