from typing import Optional

from database.models import Developer, DeveloperManager, FirmwareUpdate
from fastapi import Header, HTTPException
from firmware.firmware_types import (
    ApproveFirmwareRequest,
    RejectFirmwareRequest,
    convert_firmware_update_to_response,
)
from login.isolation import require_developer_manager
from sqlalchemy.orm import Session


def reject_firmware(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    db: Session,
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
    firmware.declined_comment = payload.rejection_reason.strip()  # type: ignore

    db.commit()
    db.refresh(firmware)

    return convert_firmware_update_to_response(firmware, db)


def approve_firmware(
    firmware_id: int,
    payload: ApproveFirmwareRequest,
    db: Session,
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
    firmware.declined_by = None  # type: ignore
    firmware.declined_comment = None  # type: ignore

    db.commit()
    db.refresh(firmware)

    return convert_firmware_update_to_response(firmware, db)

