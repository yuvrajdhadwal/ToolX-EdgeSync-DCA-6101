from typing import List
from pydantic import BaseModel

# Add Pydantic model for deploy request
class DeployFirmwareRequest(BaseModel):
    serial_number: str
    isEmergency: bool = False


# Re-added Pydantic model deploying many requests
class DeployManyRequest(BaseModel):
    serial_numbers: List[str]
    firmware_id: int
    isEmergency: bool = False