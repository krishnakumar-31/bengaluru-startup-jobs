from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.public_map import PublicStatsResponse, OfficeLocationMapResponse
from app.services.public_map_service import PublicMapService

router = APIRouter()


@router.get("/stats/public", response_model=PublicStatsResponse, summary="Get Live Database Statistics")
def get_public_stats(response: Response, db: Session = Depends(get_db)) -> PublicStatsResponse:
    """
    Returns live, database-backed statistics for the public homepage:
    - Total approved companies
    - Total office locations
    - Active job openings
    - Total vacancies
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    service = PublicMapService(db)
    return service.get_public_stats()


@router.get("/map/locations", response_model=List[OfficeLocationMapResponse], summary="Get Approved Office Locations for Map")
def get_map_locations(
    response: Response,
    locality: Optional[str] = Query(default=None, description="Filter by office locality (e.g. Koramangala)"),
    search: Optional[str] = Query(default=None, description="Search term across company, office, or job title"),
    skills: Optional[str] = Query(default=None, description="Filter by required skills (comma-separated)"),
    db: Session = Depends(get_db),
) -> List[OfficeLocationMapResponse]:
    """
    Returns all approved company office coordinates for the public interactive map.
    Only approved PostgreSQL records are returned (zero unverified MCA candidates).
    Clearly distinguishes offices with active vacancies from those without vacancies.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    skill_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else None
    service = PublicMapService(db)
    return service.get_public_map_locations(locality=locality, search=search, skills=skill_list)
