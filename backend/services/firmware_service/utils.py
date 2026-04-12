"""
Firmware utility functions for status checks and response mapping.

Functions:
- get_firmware_status: Determine current firmware status
- map_firmware_response: Convert FirmwareUpdate model to FirmwareResponse DTO
- user_can_view_firmware: Check if user has access to view firmware
"""

from sqlalchemy.orm import Session

from models import Deploy, FirmwareUpdate, User


def get_firmware_status(firmware: FirmwareUpdate, db: Session = None) -> str:
    """Determine the current status of a firmware update.
    
    Returns:
        "rejected" if declined, "deployed" if approved and deployed,
        "current" if approved, or "pending" if not yet approved.
    """
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


def map_firmware_response(firmware: FirmwareUpdate, db: Session = None) -> dict:
    """Convert FirmwareUpdate model to response DTO.
    
    Args:
        firmware: FirmwareUpdate database model
        db: Optional database session for status determination
        
    Returns:
        FirmwareResponse-compatible dict with status field populated
    """
    from routers.firmware import FirmwareResponse  # Avoid circular imports
    
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
    )


def user_can_view_firmware(user: User, firmware_id: int) -> bool:
    """Check if user has viewable access to firmware.
    
    Args:
        user: User database model
        firmware_id: ID of firmware to check access for
        
    Returns:
        True if user has firmware in their viewable_firmware list
    """
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)
