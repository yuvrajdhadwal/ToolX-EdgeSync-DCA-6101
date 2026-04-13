class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"

class User(BaseModel):
    role: UserRole
    username: str
    password: str
    developer_manager_id: Optional[int] = None

class Firmware(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str

class Device(BaseModel):
    serial_number: str
    device_type: str
    version_number: Optional[str] = None
    description: str
    location: str
    developer_manager: str
    longitude: Optional[float] = None
    latitude: Optional[float] = None

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