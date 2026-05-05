from typing import Optional

from database.database_types import UserRole
from database.models import Developer, DeveloperManager, Device, FirmwareUpdate
from fastapi import Header, HTTPException, Response, UploadFile
from firmware.isolation import user_can_view_firmware
from login.authentication import get_authenticated_user
from sqlalchemy.orm import Session

ELF = b"\x7fELF"  # actual binary elf magic key
MAX_FIRMWARE_UPLOAD_BYTES = 25 * 1024 * 1024


async def upload_firmware(
    file: UploadFile,
    device_type: str,
    version_number: str,
    isEmergency: bool,
    description: str,
    authorization: Optional[str],
    db: Session,
    previous_firmware_id: Optional[int] = None
):
    if not authorization:
        raise HTTPException(
            status_code=401, detail="Missing or invalid authorization header"
        )

    authenticated_user = get_authenticated_user(authorization, db)
    if authenticated_user.type != UserRole.developer.value:  # type: ignore
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

    header = await file.read(4)  # reads the first 4 bytes of the file
    await file.seek(0)  # returns file pointer to first byte

    if not header == ELF:
        raise HTTPException(
            status_code=400,
            detail="Only Executable and Linkable (ELF) Files can be uploaded",
        )

    file_content = await file.read()
    if len(file_content) > MAX_FIRMWARE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Firmware file too large. Maximum upload size is 25 MB",
        )

    firmware = FirmwareUpdate(
        objectBinary=file_content,
        version_number=version_number,
        device_type=device_type,
        description=description,
        uploaded_by=developer_user.id,
        isEmergency=isEmergency,
        previous_firmware_id = previous_firmware_id,
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
    if user.type == UserRole.business_manager.value:  # type: ignore
        return Response(
            content=firmware.objectBinary,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=firmware_{firmware.id}"
            },
        )

    if (
        not user_can_view_firmware(user, firmware.id)  # type: ignore
        and firmware.uploaded_by != user.id
    ):
        raise HTTPException(status_code=404, detail="Firmware not found")

    return Response(
        content=firmware.objectBinary,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=firmware_{firmware.id}"},
    )


def download_firmware_from_device(
    firmware_id: int,
    db: Session,
):
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    return Response(
        content=firmware.objectBinary,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=firmware_{firmware.id}"},
    )


def download_current_firmware_for_device(
    device_serial_number: str,
    db: Session,
):
    firmware_id = (
        db.query(Device).filter(Device.serial_number == device_serial_number).first()
    )
    if not firmware_id:
        raise HTTPException(status_code=404, detail="Device not found")
    firmware_id = firmware_id.firmware_id
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    return Response(
        content=firmware.objectBinary,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=firmware_{firmware.id}"},
    )
