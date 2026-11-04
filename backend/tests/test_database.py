import pytest
from sqlalchemy import text
from app.db.session import engine


def test_postgres_connectivity_select_1():
    """Verify active database connectivity to PostgreSQL using 'SELECT 1'.

    This ensures that SQLAlchemy can establish a connection with the configured credentials
    and successfully execute a query.
    """
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar()
        assert result == 1
