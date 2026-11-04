from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Integer,
    ForeignKey,
    Index,
    UniqueConstraint,
    CheckConstraint,
    DateTime,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.office import Office
    from app.models.job_source import JobSource


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    office_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("offices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    employment_type: Mapped[str] = mapped_column(
        String(50), default="full-time", server_default="full-time", nullable=False, index=True
    )
    experience_level: Mapped[Optional[str]] = mapped_column(
        String(50), default="mid", server_default="mid", nullable=True, index=True
    )

    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(
        String(10), default="INR", server_default="INR", nullable=True
    )

    skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(100)), nullable=True)
    application_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default="active", server_default="active", nullable=False, index=True
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True, index=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="jobs")
    office: Mapped[Optional["Office"]] = relationship("Office", back_populates="jobs")
    sources: Mapped[List["JobSource"]] = relationship(
        "JobSource",
        back_populates="job",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Backward compatibility properties
    @hybrid_property
    def is_active(self) -> bool:
        return self.status == "active"

    @is_active.setter
    def is_active(self, value: bool) -> None:
        self.status = "active" if value else "closed"

    @is_active.expression
    def is_active(cls):
        return cls.status == "active"

    @hybrid_property
    def salary_currency(self) -> Optional[str]:
        return self.currency

    @salary_currency.setter
    def salary_currency(self, value: Optional[str]) -> None:
        self.currency = value

    @salary_currency.expression
    def salary_currency(cls):
        return cls.currency

    @hybrid_property
    def role_type(self) -> str:
        return self.employment_type

    @role_type.setter
    def role_type(self, value: str) -> None:
        self.employment_type = value

    @role_type.expression
    def role_type(cls):
        return cls.employment_type

    @property
    def locality(self) -> Optional[str]:
        return self.office.locality if self.office else None

    @property
    def company_name(self) -> str:
        return self.company.name if self.company else ""

    @property
    def latitude(self) -> Optional[float]:
        return self.office.latitude if self.office else None

    @property
    def longitude(self) -> Optional[float]:
        return self.office.longitude if self.office else None

    @property
    def city(self) -> str:
        return self.office.city if self.office else "Bengaluru"

    @property
    def address(self) -> Optional[str]:
        return self.office.address if self.office else None

    __table_args__ = (
        UniqueConstraint("slug", name="uq_jobs_slug"),
        UniqueConstraint("company_id", "title", "office_id", name="uq_jobs_company_title_office"),
        Index(
            "uq_jobs_company_title_remote",
            "company_id",
            "title",
            unique=True,
            postgresql_where=text("office_id IS NULL"),
        ),
        CheckConstraint(
            "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
            name="check_jobs_salary_min_max",
        ),
    )
