from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Index, UniqueConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.job import Job


class JobSource(Base):
    __tablename__ = "job_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="sources")

    __table_args__ = (
        UniqueConstraint("job_id", "source_url", name="uq_job_sources_job_source_url"),
    )
