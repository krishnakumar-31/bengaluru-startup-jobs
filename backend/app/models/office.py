from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, Index, CheckConstraint, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.job import Job


class Office(Base, TimestampMixin):
    __tablename__ = "offices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    locality: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    city: Mapped[str] = mapped_column(
        String(100), default="Bengaluru", server_default="Bengaluru", nullable=False, index=True
    )
    state: Mapped[str] = mapped_column(
        String(100), default="Karnataka", server_default="Karnataka", nullable=False
    )
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_headquarters: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="offices")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="office")

    @validates("latitude")
    def validate_latitude(self, key: str, value: Optional[float]) -> Optional[float]:
        if value is not None:
            try:
                val = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"Latitude must be a valid numeric value, got {value!r}")
            if not (-90.0 <= val <= 90.0):
                raise ValueError(f"Latitude must be between -90.0 and 90.0 degrees, got {val}")
            return val
        return value

    @validates("longitude")
    def validate_longitude(self, key: str, value: Optional[float]) -> Optional[float]:
        if value is not None:
            try:
                val = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"Longitude must be a valid numeric value, got {value!r}")
            if not (-180.0 <= val <= 180.0):
                raise ValueError(f"Longitude must be between -180.0 and 180.0 degrees, got {val}")
            return val
        return value

    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)",
            name="check_office_latitude_range",
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)",
            name="check_office_longitude_range",
        ),
        Index("idx_offices_lat_lng", "latitude", "longitude"),
    )
