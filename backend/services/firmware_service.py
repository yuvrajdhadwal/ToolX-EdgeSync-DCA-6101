import os
from datetime import datetime, timezone
from typing import List, Optional

from azure.iot.hub import IoTHubRegistryManager
from pydantic import BaseModel
from sqlalchemy.orm import Session

from iot import FirmwareOverview, deploy_helper
from models import (BusinessManager, Deploy, Developer, DeveloperManager, Device,
                    FirmwareUpdate, User)


class FirmwareResponse(BaseModel):
    """Response DTO for firmware objects."""
    id: int
    version_number: str
    device_type: str
    description: Optional[str]
    isEmergency: bool
    uploaded_by: Optional[int]
    uploaded_timestamp: Optional[datetime]
    approved_by: Optional[int]
    declined_by: Optional[int]
    declined_comment: Optional[str]
    status: str

    class Config:
        from_attributes = True


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


def deploy_firmware(
    db: Session,
    firmware_id: int,
    serial_number: str,
    business_manager_id: int,
    is_emergency: bool = False,
) -> dict:
    """Deploy firmware to a single device."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise ValueError("Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise ValueError("Only approved firmware can be deployed")

    device = db.query(Device).filter(Device.serial_number == serial_number).first()
    if not device:
        raise ValueError("Device not found")

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == business_manager_id).first()
    )
    if not business_manager:
        raise ValueError("Business manager not found")

    iot_notification_status = "Not Configured"
    connection_str = os.getenv("IOT_CONNECTION")

    if connection_str:
        try:
            iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)
            firmware_overview = FirmwareOverview(
                id=str(firmware.id),
                device_type=firmware.device_type,
                developer=str(firmware.uploaded_by or ""),
                version_number=firmware.version_number,
                isEmergency="1" if (firmware.isEmergency or is_emergency) else "0",
                description=firmware.description or "",
            )
            message_sent = deploy_helper(serial_number, iot_hub, firmware_overview)
            iot_notification_status = "sent" if message_sent else "failed"
        except Exception as e:
            print(f"IoT notification error: {e}")
            iot_notification_status = "failed"

    existing_deploy = (
        db.query(Deploy)
        .filter(
            Deploy.device_serial == serial_number,
            Deploy.isActive == True,
        )
        .first()
    )
    if existing_deploy:
        existing_deploy.isActive = False

    device.firmware_id = firmware_id
    device.last_update = datetime.now(timezone.utc)

    deploy = Deploy(
        manager_id=business_manager_id,
        target_firmware_id=firmware_id,
        device_serial=device.serial_number,
        device_firmware_id=firmware_id,
        timestamp=datetime.now(timezone.utc),
        isActive=True,
        isEmergency=is_emergency,
    )
    db.add(deploy)
    db.commit()

    return {
        "message": f"Firmware successfully deployed to device {serial_number}",
        "iot_notification": iot_notification_status,
    }


def cloud_to_many_device(
    db: Session,
    firmware_id: int,
    serial_numbers: List[str],
    business_manager_id: int,
    is_emergency: bool = False,
) -> dict:
    """Deploy firmware to multiple devices."""
    firmware = (
        db.query(FirmwareUpdate)
        .filter(FirmwareUpdate.id == firmware_id)
        .first()
    )
    if not firmware:
        raise ValueError("Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise ValueError("Only approved firmware can be deployed")

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == business_manager_id).first()
    )
    if not business_manager:
        raise ValueError("Business manager not found")

    connection_str = os.getenv("IOT_CONNECTION")
    iot_hub = (
        IoTHubRegistryManager.from_connection_string(connection_str)
        if connection_str
        else None
    )

    firmware_overview = FirmwareOverview(
        id=str(firmware.id),
        device_type=firmware.device_type,
        developer=str(firmware.uploaded_by or ""),
        version_number=firmware.version_number,
        isEmergency="1" if (firmware.isEmergency or is_emergency) else "0",
        description=firmware.description or "",
    )

    results = []
    for serial in serial_numbers:
        device = db.query(Device).filter(Device.serial_number == serial).first()
        if not device:
            results.append({"serial_number": serial, "status": "not found"})
            continue

        iot_status = "not configured"
        if iot_hub:
            try:
                sent = deploy_helper(serial, iot_hub, firmware_overview)
                iot_status = "sent" if sent else "failed"
            except Exception as e:
                print(f"IoT error for {serial}: {e}")
                iot_status = "failed"

        existing_deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == serial,
                Deploy.isActive == True,
            )
            .first()
        )
        if existing_deploy:
            existing_deploy.isActive = False

        device.firmware_id = firmware_id
        device.last_update = datetime.now(timezone.utc)

        deploy = Deploy(
            manager_id=business_manager_id,
            target_firmware_id=firmware_id,
            device_serial=serial,
            device_firmware_id=firmware_id,
            timestamp=datetime.now(timezone.utc),
            isActive=True,
            isEmergency=is_emergency,
        )
        db.add(deploy)
        results.append(
            {
                "serial_number": serial,
                "status": "deployed",
                "iot_notification": iot_status,
            }
        )

    db.commit()
    return {
        "message": f"Deployed to {len([r for r in results if r['status'] == 'deployed'])} device(s)",
        "results": results,
    }


def get_compatible_devices(db: Session, firmware_id: int) -> dict:
    """Get list of devices compatible with firmware."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise ValueError("Firmware not found")

    devices = db.query(Device).filter(Device.device_type == firmware.device_type).all()
    compatible = [
        d for d in devices
        if not d.firmware or d.firmware.version_number != firmware.version_number
    ]

    all_regions = [
        "Africa", "Antarctica", "Asia", "Europe",
        "North America", "Oceania", "South America", "Unknown"
    ]

    return {
        "devices": [
            {
                "serial_number": d.serial_number,
                "device_type": d.device_type,
                "location": d.location,
                "current_version": d.firmware.version_number if d.firmware else None,
                "region": get_region_from_coordinates(d.latitude, d.longitude),
            }
            for d in compatible
        ],
        "all_regions": all_regions,
    }


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
