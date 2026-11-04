from abc import ABC, abstractmethod
from typing import List
from app.pipeline.models import RawStartupRecord


class BaseCollector(ABC):
    """Abstract base class for all startup and job data collectors."""

    name: str = "base_collector"
    source_type: str = "unknown"

    @abstractmethod
    def collect(self) -> List[RawStartupRecord]:
        """Collect and return raw startup records."""
        pass
