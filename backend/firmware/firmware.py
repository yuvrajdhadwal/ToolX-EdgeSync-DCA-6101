from typing import Optional

from database.database_types import UserRole
from database.models import FirmwareUpdate
from fastapi import Header, HTTPException
from firmware.firmware_types import convert_firmware_update_to_response
from firmware.isolation import user_can_view_firmware
from login.authentication import get_authenticated_user
from sqlalchemy.orm import Session


def get_firmware_by_status(
    status: str,
    db: Session,
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if status not in {"current", "pending", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use 'pending', 'current', or 'rejected'",
        )

    if status == "pending":
        if user.type == UserRole.developer.value:  # type: ignore
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:  # type: ignore
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
        if user.type == UserRole.developer.value:  # type: ignore
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:  # type: ignore
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
        if user.type == UserRole.developer.value:  # type: ignore
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:  # type: ignore
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

    return [convert_firmware_update_to_response(record, db) for record in records]


def get_firmware_by_id(
    firmware_id: int,
    db: Session,
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()

    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    # Business managers can view all firmware
    if user.type == UserRole.business_manager.value:  # type: ignore
        return convert_firmware_update_to_response(firmware, db)

    if (
        not user_can_view_firmware(user, firmware.id)  # type: ignore
        and firmware.uploaded_by != user.id
    ):
        raise HTTPException(status_code=404, detail="Firmware not found")

    return convert_firmware_update_to_response(firmware, db)

