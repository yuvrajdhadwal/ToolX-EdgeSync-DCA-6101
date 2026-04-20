from datetime import datetime
from typing import Optional

from database.models import Deploy, FirmwareUpdate
from pydantic import BaseModel
from sqlalchemy.orm import Session

class RejectionHistoryEntry(BaseModel):
    firmware_id: int
    version_number: str
    declined_by: Optional[int]
    declined_comment: Optional[str]
    uploaded_timestamp: Optional[datetime]


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
    previous_firmware_id: Optional[int] = None
    rejection_history: list[RejectionHistoryEntry] = []

    class Config:
        from_attributes = True


class RejectFirmwareRequest(BaseModel):
    rejecting_manager_username: str
    rejection_reason: str


class ApproveFirmwareRequest(BaseModel):
    confirmation_text: str


def get_firmware_status(firmware: FirmwareUpdate, db: Session) -> str:
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


def get_rejection_history(
    firmware: FirmwareUpdate, db: Session
) -> list[RejectionHistoryEntry]:
    history = []
    current = firmware
    while current.previous_firmware_id is not None:
        prev = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == current.previous_firmware_id).first()
        if not prev:
            break
        history.append(RejectionHistoryEntry(
            firmware_id=prev.id,
            version_number=prev.version_number,
            declined_by=prev.declined_by,
            declined_comment=prev.declined_comment,
            uploaded_timestamp=prev.uploaded_timestamp,
        ))
        current = prev
    return history


def convert_firmware_update_to_response(
    firmware: FirmwareUpdate, db: Session, include_history: bool = False
) -> FirmwareResponse:
    history = []
    if include_history:
        history = get_rejection_history(firmware, db)
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
        previous_firmware_id=firmware.previous_firmware_id,
        rejection_history=history,
    )


class FirmwareOverview(BaseModel):
    id: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: str
    description: str

