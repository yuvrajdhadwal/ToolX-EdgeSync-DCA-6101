from fastapi import FastAPI, Depends, HTTPException, status, Header, Form, File, UploadFile, Response
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import bcrypt  
from database import SessionLocal, engine, Base
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from enum import Enum
from azure.iot.hub import IoTHubRegistryManager

from models import User, Developer, DeveloperManager, BusinessManager, FieldShopProfessional, FirmwareUpdate, Device, Deploy

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional

from iot import deploy_helper, FirmwareOverview

from pydantic import BaseModel, field_validator

app = FastAPI()
Base.metadata.create_all(bind=engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
load_dotenv()

origins = [ 
    os.getenv('LOCAL_ORIGIN', 'http://localhost:5173'),
]

app.add_middleware( 
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"


class UserCreate(BaseModel):
    role: UserRole
    username: str
    password: str
    developer_manager_id: Optional[int] = None


class FirmwareCreate(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str

class DeviceCreate(BaseModel):
    serial_number: str
    device_type: str
    version_number: str
    description: str
    location: str
    developer_manager: str

    @field_validator('device_type', 'serial_number', 'version_number', 'description', 'location', 'developer_manager')
    @classmethod
    def fields_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Field must not be empty')
        return v
    
# Add Pydantic model for deploy request
class DeployFirmwareRequest(BaseModel):
    serial_number: str

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

@app.get("/devmng")
def get_devmng(db: Session = Depends(get_db)):
    managers = db.query(DeveloperManager).all()
    return [{"id": mng.id, "username": mng.username} for mng in managers]

def create_user(db: Session, user: UserCreate):
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    if user.role == UserRole.developer:
        if not user.developer_manager_id:
            raise HTTPException(status_code=400, detail="Developer must have a developer manager ID")
        developer_manager = db.query(DeveloperManager).filter(DeveloperManager.id == user.developer_manager_id).first()
        if not developer_manager:
            raise HTTPException(status_code=404, detail="Developer manager not found")
        db_user = Developer(username=user.username, hashed_password=hashed_password, manager_id=developer_manager.id)
    elif user.role == UserRole.developer_manager:
        db_user = DeveloperManager(username=user.username, hashed_password=hashed_password)
    elif user.role == UserRole.business_manager:
        db_user = BusinessManager(username=user.username, hashed_password=hashed_password)
    elif user.role == UserRole.field_shop_professional:
        db_user = FieldShopProfessional(username=user.username, hashed_password=hashed_password)
    else:
        raise HTTPException(status_code=400, detail="Invalid role type")

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return "complete"

# Add deploy endpoint
@app.post("/firmware/{firmware_id}/deploy")
def deploy_firmware(
    firmware_id: int,
    payload: DeployFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(status_code=403, detail="Only business managers can deploy firmware")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise HTTPException(status_code=400, detail="Only approved firmware can be deployed")

    device = db.query(Device).filter(Device.serial_number == payload.serial_number).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Check if already deployed to this device
    existing_deploy = db.query(Deploy).filter(
        Deploy.target_firmware_id == firmware_id,
        Deploy.device_serial == payload.serial_number,
    ).first()
    if existing_deploy:
        raise HTTPException(status_code=400, detail="Firmware already deployed to this device")

    business_manager = db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    if not business_manager:
        raise HTTPException(status_code=404, detail="Business manager not found")

    deploy = Deploy(
        manager_id=business_manager.id,
        target_firmware_id=firmware_id,
        device_serial=device.serial_number,
        device_firmware_id=device.firmware_id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(deploy)
    db.commit()
    db.refresh(deploy)

    return {"message": f"Firmware successfully deployed to device {payload.serial_number}"}


# Add endpoint to get devices compatible with a firmware (matching device_type)
@app.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(status_code=403, detail="Only business managers can view compatible devices")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    devices = db.query(Device).filter(Device.device_type == firmware.device_type).all()

    # Get already-deployed serial numbers for this firmware
    deployed_serials = {
        d.device_serial for d in db.query(Deploy).filter(Deploy.target_firmware_id == firmware_id).all()
    }

    return [
        {
            "serial_number": d.serial_number,
            "device_type": d.device_type,
            "location": d.location,
            "already_deployed": d.serial_number in deployed_serials,
        }
        for d in devices
    ]

@app.post("/upload")
async def upload_firmware(
    file: UploadFile = File(...),
    device_type: str = Form(...),
    version_number: str = Form(...),
    isEmergency: bool = Form(...),
    description: str = Form(...),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    authenticated_user = get_authenticated_user(authorization, db)
    if authenticated_user.type != UserRole.developer.value:
        raise HTTPException(status_code=403, detail="Only developers can upload firmware")

    developer_user = db.query(Developer).filter(Developer.id == authenticated_user.id).first()
    if not developer_user:
        raise HTTPException(status_code=404, detail="Developer not found")

    if developer_user.manager_id is None:
        raise HTTPException(status_code=400, detail="Developer does not have an assigned manager")

    manager_user = db.query(DeveloperManager).filter(DeveloperManager.id == developer_user.manager_id).first()
    if not manager_user:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    file_content = await file.read()
    firmware = FirmwareUpdate(
        objectBinary=file_content,
        version_number=version_number,
        device_type=device_type,
        description=description,
        uploaded_by=developer_user.id,
        isEmergency=isEmergency,
    )

    manager_user.viewable_firmware.append(firmware)

    db.add(firmware)
    db.commit()
    db.refresh(firmware)
    return {'message': 'upload successful'}
  

@app.post("/add_device")
def add_device(device: DeviceCreate, db: Session = Depends(get_db)):
    existing_device = db.query(Device).filter(
        Device.serial_number == device.serial_number
    ).first()
    if existing_device:
        raise HTTPException(status_code=400, detail="Device with this serial number already exists")
    
    firmware = db.query(FirmwareUpdate).filter(
        FirmwareUpdate.version_number == device.version_number,
        FirmwareUpdate.device_type == device.device_type
    ).first()

    if not firmware:
        firmware = FirmwareUpdate(
            version_number=device.version_number,
            device_type=device.device_type,
            description=device.description,
            objectBinary=b'',
            isEmergency=False,
        )
        db.add(firmware)
        db.commit()
        db.refresh(firmware)

    db_device = Device(
        serial_number=device.serial_number,
        firmware_id=firmware.id,
        device_type=device.device_type,
        location=device.location,
        developer_manager=device.developer_manager,
        description=device.description,
        last_update=datetime.now(timezone.utc),
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return {"message": "Device added successfully"}


@app.get("/get_devices")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return [
        {
            "device_type": d.device_type,
            "version_number": d.firmware.version_number if d.firmware else "N/A",
            "last_update": d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A",
            "location": d.location,
            "serial_number": d.serial_number,
            "description": d.description,
        }
        for d in devices
    ]

@app.delete("/remove_device/{serial_number}")
def delete_device(serial_number: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.serial_number == serial_number).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted successfully"}


@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)


def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encode_jwt


@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.type}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")


def get_token_payload_from_header(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    return verify_token(token=token)
        
def get_authenticated_user(authorization: Optional[str], db: Session) -> User:
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token=token)
    username = payload.get("sub")

    if not username:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def user_can_view_firmware(user: User, firmware_id: int) -> bool:
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)


def require_developer_manager(authorization: Optional[str]) -> str:
    payload = get_token_payload_from_header(authorization)
    role = payload.get("role")
    username = payload.get("sub")

    if role != UserRole.developer_manager.value:
        raise HTTPException(status_code=403, detail="Only developer managers can perform this action")

    if not username:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

    return username


@app.get("/users/{user_id}/username")
def get_username_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    get_authenticated_user(authorization, db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username}
    

@app.post("/deploy-to-one-device")
def cloud_to_device(device_id: str, firmware: FirmwareOverview):
    connection_str = os.getenv('IOT_CONNECTION')
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)
    if not deploy_helper(device_id, iot_hub, firmware):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device not found or invalid DeviceID"
        )
    return {"status": "sent"}


@app.post("/deploy-to-many-devices")
def cloud_to_many_device(device_ids: list[str], firmware: FirmwareOverview):
    connection_str = os.getenv('IOT_CONNECTION')
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)

    for device_id in device_ids:
        if not deploy_helper(device_id, iot_hub, firmware):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device not found or invalid DeviceID"
            )
    return {"status": "sent to all devices"}


@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    payload = verify_token(token=token)
    return {"message": "Token is valid", "user": payload.get("sub"), "role": payload.get("role")}


class FirmwareResponse(BaseModel):
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


class RejectFirmwareRequest(BaseModel):
    rejecting_manager_username: str
    rejection_reason: str


class ApproveFirmwareRequest(BaseModel):
    confirmation_text: str


# Update firmware status to reflect deployed status
def get_firmware_status(firmware: FirmwareUpdate, db: Session = None) -> str:
    if firmware.declined_by is not None:
        return "rejected"
    if firmware.approved_by is not None:
        if db:
            deployed = db.query(Deploy).filter(Deploy.target_firmware_id == firmware.id).first()
            if deployed:
                return "deployed"
        return "current"
    return "pending"


def map_firmware_response(firmware: FirmwareUpdate, db: Session = None) -> FirmwareResponse:
    return FirmwareResponse(
        id=firmware.id,
        version_number=firmware.version_number,
        device_type=firmware.device_type,
        description=firmware.description,
        isEmergency=firmware.isEmergency,
        uploaded_by=firmware.uploaded_by,
        uploaded_timestamp=firmware.uploaded_timestamp,
        approved_by=firmware.approved_by,
        declined_by=firmware.declined_by,
        declined_comment=firmware.declined_comment,
        status=get_firmware_status(firmware, db),
    )


@app.get("/firmware-device-types", response_model=List[str])
def get_firmware_device_types(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type == UserRole.developer.value:
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .filter(FirmwareUpdate.uploaded_by == user.id)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]
    elif user.type == UserRole.developer_manager.value:
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .join(Developer, FirmwareUpdate.uploaded_by == Developer.id)
            .filter(Developer.manager_id == user.id)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]
    else:
        # business_manager sees all device types
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]

    return device_types


@app.get("/firmware/status/{status}", response_model=List[FirmwareResponse])
def get_firmware_by_status(
    status: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if status not in {"current", "pending", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'pending', 'current', or 'rejected'")

    if status == "pending":
        if user.type == UserRole.developer.value:
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.uploaded_by == user.id,
                FirmwareUpdate.approved_by.is_(None),
                FirmwareUpdate.declined_by.is_(None),
            ).all()
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all pending firmware
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.approved_by.is_(None),
                FirmwareUpdate.declined_by.is_(None),
            ).all()

    elif status == "current":
        if user.type == UserRole.developer.value:
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.uploaded_by == user.id,
                FirmwareUpdate.approved_by.isnot(None),
                FirmwareUpdate.declined_by.is_(None),
            ).all()
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is not None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all approved firmware
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.approved_by.isnot(None),
                FirmwareUpdate.declined_by.is_(None),
            ).all()

    else:  # rejected
        if user.type == UserRole.developer.value:
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.uploaded_by == user.id,
                FirmwareUpdate.declined_by.isnot(None),
            ).all()
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.declined_by is not None
            ]
        else:
            # business_manager sees all rejected firmware
            records = db.query(FirmwareUpdate).filter(
                FirmwareUpdate.declined_by.isnot(None),
            ).all()

    return [map_firmware_response(record) for record in records]


@app.get("/firmware/{firmware_id}", response_model=FirmwareResponse)
def get_firmware_by_id(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()

    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    # Business managers can view all firmware
    if user.type == UserRole.business_manager.value:
        return map_firmware_response(firmware)

    if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
        raise HTTPException(status_code=404, detail="Firmware not found")

    return map_firmware_response(firmware)


@app.post("/firmware/{firmware_id}/download")
def download_firmware(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")
    if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
        raise HTTPException(status_code=404, detail="Firmware not found")
    return Response(
        content=firmware.objectBinary,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=firmware_{firmware.id}.bin"}
    )


@app.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    token_username = require_developer_manager(authorization)

    if payload.rejecting_manager_username.strip().lower() != token_username.strip().lower():
        raise HTTPException(status_code=403, detail="Rejecting manager must match the authenticated user")

    if not payload.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    manager = db.query(DeveloperManager).filter(DeveloperManager.username == token_username).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise HTTPException(status_code=400, detail="Only pending firmware can be rejected")

    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(viewable.id == firmware.id for viewable in uploader.viewable_firmware):
        uploader.viewable_firmware.append(firmware)

    firmware.declined_by = manager.id
    firmware.declined_comment = payload.rejection_reason.strip()

    db.commit()
    db.refresh(firmware)

    return map_firmware_response(firmware)


@app.post("/firmware/{firmware_id}/approve", response_model=FirmwareResponse)
def approve_firmware(
    firmware_id: int,
    payload: ApproveFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    token_username = require_developer_manager(authorization)

    if payload.confirmation_text.strip().upper() != "CONFIRM":
        raise HTTPException(status_code=400, detail="Type CONFIRM to approve firmware")

    manager = db.query(DeveloperManager).filter(DeveloperManager.username == token_username).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise HTTPException(status_code=400, detail="Only pending firmware can be approved")

    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(viewable.id == firmware.id for viewable in uploader.viewable_firmware):
        uploader.viewable_firmware.append(firmware)

    firmware.approved_by = manager.id
    firmware.declined_by = None
    firmware.declined_comment = None

    db.commit()
    db.refresh(firmware)

    return map_firmware_response(firmware)


if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}