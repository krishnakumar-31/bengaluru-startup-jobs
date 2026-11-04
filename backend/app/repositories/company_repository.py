from typing import List, Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload
from app.models.company import Company
from app.models.office import Office


class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, company_id: int) -> Optional[Company]:
        return (
            self.db.query(Company)
            .options(
                selectinload(Company.offices),
                selectinload(Company.jobs),
            )
            .filter(Company.id == company_id)
            .first()
        )

    def get_by_slug(self, slug: str) -> Optional[Company]:
        return (
            self.db.query(Company)
            .options(
                selectinload(Company.offices),
                selectinload(Company.jobs),
            )
            .filter(Company.slug == slug)
            .first()
        )

    def get_offices(self, company_id: int) -> Optional[List[Office]]:
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return None
        return (
            self.db.query(Office)
            .filter(Office.company_id == company_id)
            .order_by(Office.id.asc())
            .all()
        )

    def list_companies(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        name: Optional[str] = None,
        industry: Optional[str] = None,
        locality: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> Tuple[List[Company], int]:
        query = self.db.query(Company)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Company.name.ilike(term),
                    Company.description.ilike(term),
                    Company.industry.ilike(term),
                )
            )

        if name:
            query = query.filter(Company.name.ilike(f"%{name.strip()}%"))

        if industry:
            query = query.filter(Company.industry.ilike(f"%{industry.strip()}%"))

        if locality:
            query = query.join(Company.offices).filter(Office.locality.ilike(f"%{locality.strip()}%")).distinct()

        if is_verified is not None:
            query = query.filter(Company.is_verified == is_verified)

        total = query.count()

        items = (
            query.options(selectinload(Company.offices))
            .order_by(Company.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def list_all(self, skip: int = 0, limit: int = 50, locality: Optional[str] = None) -> List[Company]:
        items, _ = self.list_companies(skip=skip, limit=limit, locality=locality)
        return items
