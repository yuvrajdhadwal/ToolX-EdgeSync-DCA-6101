from typing import List, Optional

from sqlalchemy.orm import Session

from models import Deploy, Developer, FirmwareUpdate, User

from .schemas import FirmwareResponse


def get_region_from_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
) -> str:
    """Map latitude/longitude to geographic region."""
    if latitude is None or longitude is None:
        return "Unknown"

    if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
        return "Unknown"

    if latitude <= -60:
        return "Antarctica"

    if -35 <= latitude <= 37 and -20 <= longitude <= 55:
        return "Africa"

    if 5 <= latitude <= 83 and -170 <= longitude <= -52:
        return "North America"

    if -55 <= latitude <= 7 and -85 <= longitude <= -35:
        return "South America"

    if 34 <= latitude <= 82 and -31 <= longitude <= 60:
        return "Europe"

    if -50 <= latitude <= 10 and 110 <= longitude <= 180:
        return "Oceania"

    if -10 <= latitude <= 81 and 26 <= longitude <= 180:
        return "Asia"

    return "Unknown"


def get_firmware_status(firmware: FirmwareUpdate, db: Session = None) -> str:
    """Determine firmware status: rejected, deployed, current, or pending."""
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


def map_firmware_response(
    firmware: FirmwareUpdate, db: Session = None
) -> FirmwareResponse:
    """Convert FirmwareUpdate model to response DTO."""
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
    """Check if user has access to view firmware."""
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)


def get_firmware_by_id(db: Session, firmware_id: int, user: User) -> FirmwareResponse:
    """Get firmware by ID with access control."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()

    if not firmware:
        raise ValueError("Firmware not found")

    user_role = user.type

    if user_role == "business_manager":
        return map_firmware_response(firmware)

    if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
        raise ValueError("Firmware not found")

    return map_firmware_response(firmware)


def get_firmware_by_status(db: Session, status: str, user: User) -> List[FirmwareResponse]:
    """Get firmware records by status (pending, current, rejected) filtered by user role."""
    if status not in {"current", "pending", "rejected"}:
        raise ValueError("Invalid status. Use 'pending', 'current', or 'rejected'")

    user_role = user.type

    if status == "pending":
        if user_role == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user_role == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is None and firmware.declined_by is None
            ]
        else:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    elif status == "current":
        if user_role == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user_role == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.approved_by is not None and firmware.declined_by is None
            ]
        else:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )

    else:  # rejected
        if user_role == "developer":
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )
        elif user_role == "developer_manager":
            records = [
                firmware
                for firmware in user.viewable_firmware
                if firmware.declined_by is not None
            ]
        else:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )

    return [map_firmware_response(record) for record in records]


def get_firmware_device_types(db: Session, user: User) -> List[str]:
    """Get list of device types for firmware based on user role."""
    user_role = user.type

    if user_role == "developer":
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .filter(FirmwareUpdate.uploaded_by == user.id)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]
    elif user_role == "developer_manager":
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
        device_types = [
            device_type
            for (device_type,) in db.query(FirmwareUpdate.device_type)
            .distinct()
            .order_by(FirmwareUpdate.device_type)
            .all()
        ]

    return device_types


def download_firmware(db: Session, firmware_id: int, user: User) -> bytes:
    """Get firmware binary content for download."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise ValueError("Firmware not found")

    user_role = user.type

    if user_role == "business_manager":
        return firmware.objectBinary

    if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
        raise ValueError("Firmware not found")

    return firmware.objectBinary
