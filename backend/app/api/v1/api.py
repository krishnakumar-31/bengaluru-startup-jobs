from fastapi import APIRouter
from app.api.v1.endpoints import health_router, jobs_router, companies_router, admin_router, preview_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="", tags=["Health"])
api_router.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(companies_router, prefix="/companies", tags=["Companies"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin Dashboard"])
api_router.include_router(preview_router, prefix="/preview", tags=["Preview"])
