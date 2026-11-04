from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.company_repository import CompanyRepository
from app.models.company import Company
from app.models.office import Office
from app.schemas.company import CompanyResponse, PaginatedCompaniesResponse


class CompanyService:
    def __init__(self, db: Session):
        self.repository = CompanyRepository(db)

    def get_company(self, company_id: int) -> Optional[Company]:
        return self.repository.get_by_id(company_id)

    def get_by_slug(self, slug: str) -> Optional[Company]:
        return self.repository.get_by_slug(slug)

    def get_company_offices(self, company_id: int) -> Optional[List[Office]]:
        return self.repository.get_offices(company_id)

    def list_companies(
        self,
        page: int = 1,
        limit: int = 20,
        skip: Optional[int] = None,
        search: Optional[str] = None,
        name: Optional[str] = None,
        industry: Optional[str] = None,
        locality: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> PaginatedCompaniesResponse:
        if skip is not None:
            actual_skip = skip
            actual_page = (skip // limit) + 1
        else:
            actual_skip = (page - 1) * limit
            actual_page = page

        items, total = self.repository.list_companies(
            skip=actual_skip,
            limit=limit,
            search=search,
            name=name,
            industry=industry,
            locality=locality,
            is_verified=is_verified,
        )
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        return PaginatedCompaniesResponse(
            items=[CompanyResponse.model_validate(c) for c in items],
            total=total,
            page=actual_page,
            limit=limit,
            total_pages=total_pages,
            has_next=actual_page < total_pages,
            has_prev=actual_page > 1,
        )

    def list_all(
        self, skip: int = 0, limit: int = 50, locality: Optional[str] = None
    ) -> List[Company]:
        return self.repository.list_all(skip=skip, limit=limit, locality=locality)
