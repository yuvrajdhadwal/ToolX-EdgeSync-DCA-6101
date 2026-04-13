
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional, Set

from acceptance_status import update_acceptance_status
from azure.iot.hub import IoTHubRegistryManager
from database import Base, SessionLocal, engine
from dotenv import load_dotenv
from fastapi import (Depends, FastAPI, File, Form, Header, HTTPException,
                     Response, UploadFile, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from iot import FirmwareOverview, deploy_helper, telemetry_listener
from jose import JWTError, jwt
from models import (BusinessManager, Deploy, Developer, DeveloperManager,
                    Device, FieldShopProfessional, FirmwareUpdate, User)
from pydantic import BaseModel
from routers.auth import router as auth_router
from routers.devices import router as devices_router
from sqlalchemy.orm import Session
from verification.security import (create_access_token, get_authenticated_user,
                                   get_token_payload_from_header,
                                   oauth2_scheme, require_developer_manager,
                                   verify_token)

app = FastAPI()
app.include_router(auth_router)
app.include_router(devices_router)
Base.metadata.create_all(bind=engine)
load_dotenv()

origins = [
    os.getenv("LOCAL_ORIGIN", "http://localhost:5173"),
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


SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
IOTHUB_CONNECTION_STRING = os.getenv("IOT_CONNECTION")
EVENTHUB_CONNECTION_STRING = os.getenv("EVENTHUB_CONNECTION")
ACTIVE_DEVICE_ONLINE_MESSAGE = os.getenv("ACTIVE_DEVICE_ONLINE_MESSAGE", "Device is Online")
ACTIVE_DEVICE_RETRY_SECONDS = int(os.getenv("ACTIVE_DEVICE_RETRY_SECONDS", "5"))

active_device_serials: Set[str] = set()
active_device_last_seen: dict[str, datetime] = {}
active_device_lock = threading.Lock()


def get_region_from_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
) -> str:
    if latitude is None or longitude is None:
        return "Unknown"

    if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
        return "Unknown"

    if latitude <= -60:
        return "Antarctica"

    if -35 <= latitude <= 37 and -20 <= longitude <= 55:
        return "Africa"

    if 5 <= latitude <= 83 and -170 <= longitude <= -52:
        return "North America"

    if -55 <= latitude <= 7 and -85 <= longitude <= -35:
        return "South America"

    if 34 <= latitude <= 82 and -31 <= longitude <= 60:
        return "Europe"

    if -50 <= latitude <= 10 and 110 <= longitude <= 180:
        return "Oceania"

    if -10 <= latitude <= 81 and 26 <= longitude <= 180:
        return "Asia"

    return "Unknown"


def _record_device_activity(device_id: str, body: str):
    if ACTIVE_DEVICE_ONLINE_MESSAGE.lower() not in body.lower():
        return

    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.serial_number == device_id).first()
        if not device:
            return

        device.last_online = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def telemetry_activity_worker():
    if not EVENTHUB_CONNECTION_STRING:
        return

    while True:
        try:
            telemetry_listener(on_activity=_record_device_activity)
        except Exception as ex:
            print(f"Active-device telemetry listener error: {ex}")

def telemetry_install_accept_worker():
    if not EVENTHUB_CONNECTION_STRING:
        return

    while True:
        try:
            telemetry_listener(on_activity=update_acceptance_status)
        except Exception as ex:
            print(f"Firmware telemetry listener error: {ex}")
            

@app.on_event("startup")
def start_active_device_worker():
    threading.Thread(target=telemetry_activity_worker, daemon=True).start()

@app.on_event("startup")
def start_firmware_worker():
    threading.Thread(target=telemetry_install_accept_worker, daemon=True).start()

class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"

class FirmwareCreate(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str


# Add Pydantic model for deploy request
class DeployFirmwareRequest(BaseModel):
    serial_number: str
    isEmergency: bool = False


# Re-added Pydantic model deploying many requests
class DeployManyRequest(BaseModel):
    serial_numbers: List[str]
    firmware_id: int
    isEmergency: bool = False


@app.get("/devmng")
def get_devmng(db: Session = Depends(get_db)):
    managers = db.query(DeveloperManager).all()
    return [{"id": mng.id, "username": mng.username} for mng in managers]


# Update deploy-to-one-device endpoint
@app.post("/firmware/{firmware_id}/deploy-to-one-device")
def deploy_firmware(
    firmware_id: int,
    payload: DeployFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(
            status_code=403, detail="Only business managers can deploy firmware"
        )

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise HTTPException(
            status_code=400, detail="Only approved firmware can be deployed"
        )

    device = (
        db.query(Device).filter(Device.serial_number == payload.serial_number).first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    )
    if not business_manager:
        raise HTTPException(status_code=404, detail="Business manager not found")

    # Send IoT C2D notification to device
    iot_notification_status = "Not Configured"
    connection_str = os.getenv("IOT_CONNECTION")

    if connection_str:
        try:
            iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)
            firmware_overview = FirmwareOverview(
                id=str(firmware.id),
                device_type=firmware.device_type,
                developer=str(firmware.uploaded_by or ""),
                version_number=firmware.version_number,
                isEmergency="1" if (firmware.isEmergency or payload.isEmergency) else "0",
                description=firmware.description or "",
            )
            message_sent = deploy_helper(
                payload.serial_number, iot_hub, firmware_overview

            )
            iot_notification_status = "sent" if message_sent else "failed"
        except Exception as e:
            print(f"IoT notification error: {e}")
            iot_notification_status = "failed"


    # Deactivate existing active deploy for this device
    existing_deploy = (
        db.query(Deploy)
        .filter(
            Deploy.device_serial == payload.serial_number,
            Deploy.isActive == True,
        )
        .first()
    )
    if existing_deploy:
        existing_deploy.isActive = False

    # Update device firmware
    device.firmware_id = firmware_id
    device.last_update = datetime.now(timezone.utc)

    # Create new active deploy record
    deploy = Deploy(
        manager_id=business_manager.id,
        target_firmware_id=firmware_id,
        device_serial=device.serial_number,
        device_firmware_id=firmware_id,
        timestamp=datetime.now(timezone.utc),
        isActive=True,
        isEmergency=payload.isEmergency,
    )
    db.add(deploy)
    db.commit()

    return {
        "message": f"Firmware successfully deployed to device {payload.serial_number}",
        "iot_notification": iot_notification_status,
    }


@app.post("/deploy-to-many-devices")
def cloud_to_many_device(
    payload: DeployManyRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(
            status_code=403, detail="Only business managers can deploy firmware"
        )

    firmware = (
        db.query(FirmwareUpdate)
        .filter(FirmwareUpdate.id == payload.firmware_id)
        .first()
    )
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise HTTPException(
            status_code=400, detail="Only approved firmware can be deployed"
        )

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    )
    if not business_manager:
        raise HTTPException(status_code=404, detail="Business manager not found")

    connection_str = os.getenv("IOT_CONNECTION")
    iot_hub = (
        IoTHubRegistryManager.from_connection_string(connection_str)
        if connection_str
        else None
    )

    firmware_overview = FirmwareOverview(
        id=str(firmware.id),
        device_type=firmware.device_type,
        developer=str(firmware.uploaded_by or ""),
        version_number=firmware.version_number,
        isEmergency="1" if (firmware.isEmergency or payload.isEmergency)  else "0",
        description=firmware.description or "",
    )

    results = []
    for serial in payload.serial_numbers:
        device = db.query(Device).filter(Device.serial_number == serial).first()
        if not device:
            results.append({"serial_number": serial, "status": "not found"})
            continue

        iot_status = "not configured"
        if iot_hub:
            try:
                sent = deploy_helper(serial, iot_hub, firmware_overview)
                iot_status = "sent" if sent else "failed"
            except Exception as e:
                print(f"IoT error for {serial}: {e}")
                iot_status = "failed"


        existing_deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == serial,
                Deploy.isActive == True,
            )
            .first()
        )
        if existing_deploy:
            existing_deploy.isActive = False

        device.firmware_id = payload.firmware_id
        device.last_update = datetime.now(timezone.utc)

        deploy = Deploy(
            manager_id=business_manager.id,
            target_firmware_id=payload.firmware_id,
            device_serial=serial,
            device_firmware_id=payload.firmware_id,
            timestamp=datetime.now(timezone.utc),
            isActive=True,
            isEmergency=payload.isEmergency,
        )
        db.add(deploy)
        results.append(
            {
                "serial_number": serial,
                "status": "deployed",
                "iot_notification": iot_status,
            }
        )

    db.commit()
    return {
        "message": f"Deployed to {len([r for r in results if r['status'] == 'deployed'])} device(s)",
        "results": results,
    }


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
    compatible = [
        d for d in devices
        if not d.firmware or d.firmware.version_number != firmware.version_number
    ]

    all_regions = [
        "Africa", "Antarctica", "Asia", "Europe",
        "North America", "Oceania", "South America", "Unknown"
    ]

    return {
        "devices": [
            {
                "serial_number": d.serial_number,
                "device_type": d.device_type,
                "location": d.location,
                "current_version": d.firmware.version_number if d.firmware else None,
                "region": get_region_from_coordinates(d.latitude, d.longitude),
            }
            for d in compatible
        ],
        "all_regions": all_regions,
    }


@app.post("/upload")
async def upload_firmware(
    file: UploadFile = File(...),
    device_type: str = Form(...),
    version_number: str = Form(...),
    isEmergency: bool = Form(...),
    description: str = Form(...),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization:
        raise HTTPException(
            status_code=401, detail="Missing or invalid authorization header"
        )

    authenticated_user = get_authenticated_user(authorization, db)
    if authenticated_user.type != UserRole.developer.value:
        raise HTTPException(
            status_code=403, detail="Only developers can upload firmware"
        )

    developer_user = (
        db.query(Developer).filter(Developer.id == authenticated_user.id).first()
    )
    if not developer_user:
        raise HTTPException(status_code=404, detail="Developer not found")

    if developer_user.manager_id is None:
        raise HTTPException(
            status_code=400, detail="Developer does not have an assigned manager"
        )

    manager_user = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.id == developer_user.manager_id)
        .first()
    )
    if not manager_user:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    header = await file.read(4)  # reads the first 4 bytes (this is where headers are)
    await file.seek(0)  # returns file pointer to start, so bugs dont appear

    elf = b"\x7fELF"  # actual elf code

    if not header == elf:
        raise HTTPException(status_code=400, detail="Only ELF files can be uploaded")

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
    return {"message": "upload successful"}


def user_can_view_firmware(user: User, firmware_id: int) -> bool:
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)


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
            deployed = (
                db.query(Deploy)
                .filter(Deploy.target_firmware_id == firmware.id)
                .first()
            )
            if deployed:
                return "deployed"
        return "current"
    return "pending"


def map_firmware_response(
    firmware: FirmwareUpdate, db: Session = None
) -> FirmwareResponse:
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
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use 'pending', 'current', or 'rejected'",
        )

    if status == "pending":
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all pending firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    elif status == "current":
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is not None and firmware.declined_by is None
            ]
        else:
            # business_manager sees all approved firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    else:  # rejected
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.declined_by is not None
            ]
        else:
            # business_manager sees all rejected firmware
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )

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

    if (
        not user_can_view_firmware(user, firmware.id)
        and firmware.uploaded_by != user.id
    ):
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

    # Business managers can download all firmware
    if user.type == UserRole.business_manager.value:
        return Response(
            content=firmware.objectBinary,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=firmware_{firmware.id}.bin"
            },
        )

    if (
        not user_can_view_firmware(user, firmware.id)
        and firmware.uploaded_by != user.id
    ):
        raise HTTPException(status_code=404, detail="Firmware not found")

    return Response(
        content=firmware.objectBinary,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename=firmware_{firmware.id}.bin"
        },
    )


@app.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    token_username = require_developer_manager(authorization)

    if (
        payload.rejecting_manager_username.strip().lower()
        != token_username.strip().lower()
    ):
        raise HTTPException(
            status_code=403,
            detail="Rejecting manager must match the authenticated user",
        )

    if not payload.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    manager = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.username == token_username)
        .first()
    )
    if not manager:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise HTTPException(
            status_code=400, detail="Only pending firmware can be rejected"
        )

    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(
        viewable.id == firmware.id for viewable in uploader.viewable_firmware
    ):
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

    manager = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.username == token_username)
        .first()
    )
    if not manager:
        raise HTTPException(status_code=404, detail="Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise HTTPException(
            status_code=400, detail="Only pending firmware can be approved"
        )

    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(
        viewable.id == firmware.id for viewable in uploader.viewable_firmware
    ):
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
