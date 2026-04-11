from sqlalchemy.orm import Session

from models import Developer, DeveloperManager, FirmwareUpdate

from .core import map_firmware_response
from .schemas import FirmwareResponse


def reject_firmware(
    db: Session,
    firmware_id: int,
    manager_id: int,
    rejecting_manager_username: str,
    rejection_reason: str,
) -> FirmwareResponse:
    """Reject pending firmware."""
    if not rejection_reason.strip():
        raise ValueError("Rejection reason is required")

    manager = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.id == manager_id)
        .first()
    )
    if not manager:
        raise ValueError("Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise ValueError("Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise ValueError("Only pending firmware can be rejected")

    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(
        viewable.id == firmware.id for viewable in uploader.viewable_firmware
    ):
        uploader.viewable_firmware.append(firmware)

    firmware.declined_by = manager.id
    firmware.declined_comment = rejection_reason.strip()

    db.commit()
    db.refresh(firmware)

    return map_firmware_response(firmware)


def approve_firmware(
    db: Session,
    firmware_id: int,
    manager_id: int,
) -> FirmwareResponse:
    """Approve pending firmware."""
    manager = (
        db.query(DeveloperManager)
        .filter(DeveloperManager.id == manager_id)
        .first()
    )
    if not manager:
        raise ValueError("Developer manager not found")

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise ValueError("Firmware not found")

    if firmware.approved_by is not None or firmware.declined_by is not None:
        raise ValueError("Only pending firmware can be approved")

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
