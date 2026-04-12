"""
Firmware router for HTTP endpoints.

Endpoints:
- POST /upload: Upload firmware binary
- GET /firmware-device-types: List device types based on user role
- GET /firmware/status/{status}: Get firmware by approval status
- GET /firmware/{firmware_id}: Get firmware details
- POST /firmware/{firmware_id}/download: Download firmware binary
- GET /firmware/{firmware_id}/compatible-devices: Get compatible devices
- POST /firmware/{firmware_id}/deploy-to-one-device: Deploy to single device
- POST /deploy-to-many-devices: Deploy to multiple devices
- POST /firmware/{firmware_id}/approve: Approve firmware
- POST /firmware/{firmware_id}/reject: Reject firmware
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Developer, DeveloperManager, FirmwareUpdate
from services import firmware_service
from verification.security import get_authenticated_user, require_developer_manager

router = APIRouter()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserRole(str, Enum):
    developer = "developer"
    developer_manager = "developer_manager"
    business_manager = "business_manager"
    field_shop_professional = "field_shop_professional"


# Pydantic Models
class FirmwareCreate(BaseModel):
    objectBinary: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str


class DeployFirmwareRequest(BaseModel):
    serial_number: str
    isEmergency: bool = False


class DeployManyRequest(BaseModel):
    serial_numbers: List[str]
    firmware_id: int
    isEmergency: bool = False


class RejectFirmwareRequest(BaseModel):
    rejecting_manager_username: str
    rejection_reason: str


class ApproveFirmwareRequest(BaseModel):
    confirmation_text: str


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


# Endpoints
@router.post("/upload")
async def upload_firmware(
    file: UploadFile = File(...),
    device_type: str = Form(...),
    version_number: str = Form(...),
    isEmergency: bool = Form(...),
    description: str = Form(...),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """Upload firmware binary file."""
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

    if not file.filename or not file.filename.lower().endswith(".bin"):
        raise HTTPException(status_code=400, detail="Only .bin files can be uploaded")

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


@router.get("/firmware-device-types", response_model=List[str])
def get_firmware_device_types(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Get list of device types based on user role."""
    user = get_authenticated_user(authorization, db)
    return firmware_service.get_firmware_device_types(user, db)


@router.get("/firmware/status/{status}", response_model=List[FirmwareResponse])
def get_firmware_by_status(
    status: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Get firmware by approval status (pending, current, rejected)."""
    user = get_authenticated_user(authorization, db)

    if status not in {"current", "pending", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use 'pending', 'current', or 'rejected'",
        )

    records = firmware_service.get_firmware_by_status(user, status, db)
    return [firmware_service.map_firmware_response(record, db) for record in records]


@router.get("/firmware/{firmware_id}", response_model=FirmwareResponse)
def get_firmware_by_id(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Get firmware details by ID."""
    user = get_authenticated_user(authorization, db)
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()

    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    # Business managers can view all firmware
    if user.type == UserRole.business_manager.value:
        return firmware_service.map_firmware_response(firmware, db)

    if (
        not firmware_service.user_can_view_firmware(user, firmware.id)
        and firmware.uploaded_by != user.id
    ):
        raise HTTPException(status_code=404, detail="Firmware not found")

    return firmware_service.map_firmware_response(firmware, db)


@router.post("/firmware/{firmware_id}/download")
def download_firmware(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Download firmware binary file."""
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
        not firmware_service.user_can_view_firmware(user, firmware.id)
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


@router.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Get devices compatible with a firmware (matching device_type)."""
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(
            status_code=403, detail="Only business managers can view compatible devices"
        )

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    return firmware_service.get_compatible_devices(firmware, db)


@router.post("/firmware/{firmware_id}/deploy-to-one-device")
def deploy_firmware(
    firmware_id: int,
    payload: DeployFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Deploy firmware to a single device."""
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(
            status_code=403, detail="Only business managers can deploy firmware"
        )

    result = firmware_service.deploy_firmware(
        firmware_id, payload.serial_number, payload.isEmergency, user, db
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/deploy-to-many-devices")
def cloud_to_many_device(
    payload: DeployManyRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Deploy firmware to multiple devices."""
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:
        raise HTTPException(
            status_code=403, detail="Only business managers can deploy firmware"
        )

    result = firmware_service.cloud_to_many_device(
        payload.firmware_id, payload.serial_numbers, payload.isEmergency, user, db
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/firmware/{firmware_id}/approve", response_model=FirmwareResponse)
def approve_firmware(
    firmware_id: int,
    payload: ApproveFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Approve pending firmware."""
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

    result = firmware_service.approve_firmware(firmware_id, manager, db)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result["firmware"]


@router.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """Reject pending firmware."""
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

    result = firmware_service.reject_firmware(
        firmware_id, manager, payload.rejection_reason, db
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result["firmware"]

