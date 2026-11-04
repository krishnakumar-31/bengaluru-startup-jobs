from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.job import Job
from app.models.company import Company
from app.models.office import Office


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, job_id: int) -> Optional[Job]:
        return (
            self.db.query(Job)
            .options(
                joinedload(Job.company),
                joinedload(Job.office),
                selectinload(Job.sources),
            )
            .filter(Job.id == job_id)
            .first()
        )

    def get_by_slug(self, slug: str) -> Optional[Job]:
        return (
            self.db.query(Job)
            .options(
                joinedload(Job.company),
                joinedload(Job.office),
                selectinload(Job.sources),
            )
            .filter(Job.slug == slug)
            .first()
        )

    def list_jobs(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        skills: Optional[List[str]] = None,
        locality: Optional[str] = None,
        employment_type: Optional[str] = None,
        experience_level: Optional[str] = None,
        company: Optional[str] = None,
        company_id: Optional[int] = None,
        status: Optional[str] = "active",
        include_expired: bool = False,
    ) -> Tuple[List[Job], int]:
        query = self.db.query(Job)

        # Search across title and description
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Job.title.ilike(term),
                    Job.description.ilike(term),
                )
            )

        # Filter by skills in the PostgreSQL array
        if skills:
            for skill in skills:
                if skill.strip():
                    query = query.filter(
                        func.array_to_string(Job.skills, ",").ilike(f"%{skill.strip()}%")
                    )

        # Filter by locality via associated office
        if locality:
            query = query.join(Job.office).filter(
                Office.locality.ilike(f"%{locality.strip()}%")
            )

        # Filter by employment type
        if employment_type:
            query = query.filter(Job.employment_type.ilike(employment_type.strip()))

        # Filter by experience level
        if experience_level:
            query = query.filter(Job.experience_level.ilike(experience_level.strip()))

        # Filter by company ID
        if company_id is not None:
            query = query.filter(Job.company_id == company_id)

        # Filter by company name or slug
        if company:
            c_term = f"%{company.strip()}%"
            query = query.join(Job.company).filter(
                or_(
                    Company.slug == company.strip().lower(),
                    Company.name.ilike(c_term),
                )
            )

        # Filter by status (e.g. 'active', or 'all' to disable status filtering)
        if status and status.lower() != "all":
            query = query.filter(Job.status == status.lower())

        # Exclude expired jobs from active listings
        if not include_expired:
            now_utc = datetime.now(timezone.utc)
            query = query.filter(
                or_(
                    Job.expires_at.is_(None),
                    Job.expires_at > now_utc,
                )
            )

        total = query.count()

        items = (
            query.options(
                joinedload(Job.company),
                joinedload(Job.office),
                selectinload(Job.sources),
            )
            .order_by(Job.posted_at.desc().nullslast(), Job.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def list_map_jobs(
        self,
        locality: Optional[str] = None,
        skills: Optional[List[str]] = None,
        search: Optional[str] = None,
        status: Optional[str] = "active",
        include_expired: bool = False,
    ) -> List[Job]:
        query = (
            self.db.query(Job)
            .join(Job.office)
            .filter(
                Office.latitude.is_not(None),
                Office.longitude.is_not(None),
            )
        )

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Job.title.ilike(term),
                    Job.description.ilike(term),
                )
            )

        if skills:
            for skill in skills:
                if skill.strip():
                    query = query.filter(
                        func.array_to_string(Job.skills, ",").ilike(f"%{skill.strip()}%")
                    )

        if locality:
            query = query.filter(Office.locality.ilike(f"%{locality.strip()}%"))

        if status and status.lower() != "all":
            query = query.filter(Job.status == status.lower())

        if not include_expired:
            now_utc = datetime.now(timezone.utc)
            query = query.filter(
                or_(
                    Job.expires_at.is_(None),
                    Job.expires_at > now_utc,
                )
            )

        return (
            query.options(
                joinedload(Job.company),
                joinedload(Job.office),
            )
            .order_by(Job.posted_at.desc().nullslast())
            .all()
        )

    def list_active(
        self, skip: int = 0, limit: int = 20, locality: Optional[str] = None
    ) -> List[Job]:
        items, _ = self.list_jobs(
            skip=skip,
            limit=limit,
            locality=locality,
            status="active",
            include_expired=True,
        )
        return items
