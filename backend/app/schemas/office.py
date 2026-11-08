from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class OfficeBase(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_headquarters: bool = False

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude must be between -90 and 90 degrees, got {v}")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude must be between -180 and 180 degrees, got {v}")
        return v


class OfficeCreate(OfficeBase):
    company_id: int


class OfficeResponse(OfficeBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
