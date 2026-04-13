from typing import Optional
from fastapi import HTTPException, Header
from sqlalchemy.orm import Session
from login.authentication import get_token_payload_from_header, get_authenticated_user
from database.database_types import UserRole
from database.models import FirmwareUpdate, Developer


def require_developer_manager(authorization: Optional[str]) -> str:
    payload = get_token_payload_from_header(authorization)
    role = payload.get("role")
    username = payload.get("sub")

    if role != UserRole.developer_manager.value:
        raise HTTPException(
            status_code=403, detail="Only developer managers can perform this action"
        )

    if not username:
        raise HTTPException(status_code=403, detail="Token is invalid or expired")

    return username


def get_firmware_device_types(
    db: Session,
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