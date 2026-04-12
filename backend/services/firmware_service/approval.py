"""
Firmware approval and rejection workflows for developer managers.
"""

from models import Developer, DeveloperManager, FirmwareUpdate
from sqlalchemy.orm import Session

from . import utils


def approve_firmware(firmware_id: int, manager: DeveloperManager, db: Session) -> dict:
    """Approve pending firmware and grant viewability to uploader."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is not None or firmware.declined_by is not None:
        return {"error": "Only pending firmware can be approved"}

    # Add firmware to manager's viewable list if not already there
    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    # Grant viewability to the uploader (developer)
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

    return {"firmware": utils.map_firmware_response(firmware, db)}


def reject_firmware(
    firmware_id: int, manager: DeveloperManager, rejection_reason: str, db: Session
) -> dict:
    """Reject pending firmware with reason."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is not None or firmware.declined_by is not None:
        return {"error": "Only pending firmware can be rejected"}

    # Add firmware to manager's viewable list if not already there
    if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
        manager.viewable_firmware.append(firmware)

    # Grant viewability to the uploader (developer)
    uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
    if uploader and not any(
        viewable.id == firmware.id for viewable in uploader.viewable_firmware
    ):
        uploader.viewable_firmware.append(firmware)

    firmware.declined_by = manager.id
    firmware.declined_comment = rejection_reason.strip()

    db.commit()
    db.refresh(firmware)

    return {"firmware": utils.map_firmware_response(firmware, db)}
