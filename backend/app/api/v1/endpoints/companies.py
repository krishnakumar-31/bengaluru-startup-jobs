from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.company_service import CompanyService
from app.schemas.company import CompanyResponse, PaginatedCompaniesResponse, CompanyDetailResponse
from app.schemas.office import OfficeResponse

router = APIRouter()


@router.get("", response_model=PaginatedCompaniesResponse, summary="List Companies")
def list_companies(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    skip: Optional[int] = Query(default=None, ge=0, description="Number of items to skip"),
    search: Optional[str] = Query(default=None, description="Search term for company name, description, industry"),
    name: Optional[str] = Query(default=None, description="Filter by company name"),
    industry: Optional[str] = Query(default=None, description="Filter by company industry"),
    locality: Optional[str] = Query(default=None, description="Filter by startup hub or office locality"),
    is_verified: Optional[bool] = Query(default=None, description="Filter by verification status"),
    db: Session = Depends(get_db),
) -> PaginatedCompaniesResponse:
    """Retrieve a paginated list of startup companies with optional filtering by name, industry, and locality."""
    service = CompanyService(db)
    return service.list_companies(
        page=page,
        limit=limit,
        skip=skip,
        search=search,
        name=name,
        industry=industry,
        locality=locality,
        is_verified=is_verified,
    )


@router.get("/{company_id}", response_model=CompanyDetailResponse, summary="Get Company by ID")
def get_company(company_id: int, db: Session = Depends(get_db)) -> CompanyDetailResponse:
    """Retrieve detailed information for a specific company by its ID."""
    service = CompanyService(db)
    company = service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found",
        )
    return CompanyDetailResponse.model_validate(company)


@router.get("/{company_id}/offices", response_model=List[OfficeResponse], summary="Get Company Offices")
def get_company_offices(company_id: int, db: Session = Depends(get_db)) -> List[OfficeResponse]:
    """Retrieve all physical office locations for a given startup company."""
    service = CompanyService(db)
    offices = service.get_company_offices(company_id)
    if offices is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found",
        )
    return [OfficeResponse.model_validate(o) for o in offices]
