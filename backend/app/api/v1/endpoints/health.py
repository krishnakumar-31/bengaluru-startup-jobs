from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
def get_health() -> HealthResponse:
    """Returns the operational status of the API service without requiring an active database connection."""
    return HealthResponse(
        status="ok",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )
