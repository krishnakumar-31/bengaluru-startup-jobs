from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class JobSourceBase(BaseModel):
    source_name: str
    source_url: str
    last_verified_at: Optional[datetime] = None


class JobSourceCreate(JobSourceBase):
    job_id: int


class JobSourceResponse(JobSourceBase):
    id: int
    job_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
