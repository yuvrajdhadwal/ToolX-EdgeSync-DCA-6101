from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FirmwareResponse(BaseModel):
    """Response DTO for firmware objects."""
    id: int
    version_number: str
    device_type: str
    description: Optional[str]
    isEmergency: bool
    uploaded_by: Optional[int]
    uploaded_timestamp: Optional[datetime]
    approved_by: Optional[int]
    declined_by: Optional[int]
    declined_comment: Optional[str]
    status: str

    class Config:
        from_attributes = True
