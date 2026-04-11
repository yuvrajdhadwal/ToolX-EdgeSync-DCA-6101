from sqlalchemy.orm import Session

from models import Developer, DeveloperManager, FirmwareUpdate


async def upload_firmware(
    db: Session,
    file_content: bytes,
    device_type: str,
    version_number: str,
    is_emergency: bool,
    description: str,
    developer_id: int,
) -> dict:
    """Upload new firmware."""
    developer_user = (
        db.query(Developer).filter(Developer.id == developer_id).first()
    )
    if not developer_user:
        raise ValueError("Developer not found")

    if developer_user.manager_id is None:
        raise ValueError("Developer does not have an assigned manager")

    manager_user = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.id == developer_user.manager_id)
        .first()
    )
    if not manager_user:
        raise ValueError("Developer manager not found")

    firmware = FirmwareUpdate(
        objectBinary=file_content,
        version_number=version_number,
        device_type=device_type,
        description=description,
        uploaded_by=developer_user.id,
        isEmergency=is_emergency,
    )

    manager_user.viewable_firmware.append(firmware)

    db.add(firmware)
    db.commit()
    db.refresh(firmware)
    return {"message": "upload successful"}
