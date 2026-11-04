from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str

    model_config = ConfigDict(extra="ignore")
