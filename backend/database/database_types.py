
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, field_validator

class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"
    super_user = "super_user"


class UserType(BaseModel):
    role: UserRole
    username: str
    password: str
    developer_manager_id: Optional[int] = None


class FirmwareType(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str


class DeviceType(BaseModel):
    serial_number: str
    device_type: str
    version_number: Optional[str] = None
    description: str
    location: str
    developer_manager: str
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    field_shop_professionals: List[str] = []

    @field_validator(
        "device_type",
        "serial_number",
        "version_number",
        "description",
        "location",
        "developer_manager",
    )
    @classmethod
    def fields_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Field must not be empty")
        return v

    @field_validator("latitude")
    @classmethod
    def latitude_must_be_valid(cls, value: Optional[float]):
        if value is None:
            return value
        if value < -90 or value > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return value

    @field_validator("longitude")
    @classmethod
    def longitude_must_be_valid(cls, value: Optional[float]):
        if value is None:
            return value
        if value < -180 or value > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return value
    

class ShopType(BaseModel):
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("location")
    @classmethod
    def fields_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Field must not be empty")
        return v

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_coordinates(cls, value: Optional[float], info):
        if value is None:
            return value
        if info.field_name == "latitude":
            if value < -90 or value > 90:
                raise ValueError("Latitude must be between -90 and 90")
        elif info.field_name == "longitude":
            if value < -180 or value > 180:
                raise ValueError("Longitude must be between -180 and 180")
        return value
            
