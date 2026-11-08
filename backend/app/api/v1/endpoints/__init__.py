from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.jobs import router as jobs_router
from app.api.v1.endpoints.companies import router as companies_router
from app.api.v1.endpoints.admin import admin_router
from app.api.v1.endpoints.preview import preview_router
from app.api.v1.endpoints.public_map import router as public_map_router

__all__ = [
    "health_router",
    "jobs_router",
    "companies_router",
    "admin_router",
    "preview_router",
    "public_map_router",
]
