from typing import Optional
from backend.database.models import FirmwareUpdate
from fastapi import Header, HTTPException, UploadFile, Response
from sqlalchemy.orm import Session
from backend.database.models import Developer, DeveloperManager
from backend.login.authentication import get_authenticated_user
from backend.database.database_types import UserRole
from backend.firmware.isolation import user_can_view_firmware

async def upload_firmware(    
    file: UploadFile,
    device_type: str,
    version_number: str,
    isEmergency: bool,
    description: str,
    authorization: Optional[str],
    db: Session):
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


def download_firmware(
    firmware_id: int,
    db: Session,
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