from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Boolean, Index, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.office import Office
    from app.models.job import Job


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    company_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False, index=True
    )

    # Backward compatibility synonym for schemas/code using website_url
    website_url = synonym("website")

    # Relationships
    offices: Mapped[List["Office"]] = relationship(
        "Office",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    jobs: Mapped[List["Job"]] = relationship(
        "Job",
        back_populates="company",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Convenience properties pointing to primary office for backward compatibility
    @property
    def primary_office(self) -> Optional["Office"]:
        return self.offices[0] if self.offices else None

    @property
    def locality(self) -> Optional[str]:
        return self.primary_office.locality if self.primary_office else None

    @property
    def address(self) -> Optional[str]:
        return self.primary_office.address if self.primary_office else None

    @property
    def latitude(self) -> Optional[float]:
        return self.primary_office.latitude if self.primary_office else None

    @property
    def longitude(self) -> Optional[float]:
        return self.primary_office.longitude if self.primary_office else None

    __table_args__ = (
        UniqueConstraint("slug", name="uq_companies_slug"),
    )
