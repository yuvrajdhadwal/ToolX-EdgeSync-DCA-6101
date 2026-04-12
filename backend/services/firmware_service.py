"""
Firmware service layer for business logic.

Expected functionality:
- Firmware upload, status, approval/rejection, and deployment helpers.
- Compatibility lookups for devices and firmware.

Functions:
- get_firmware_status: Determine current firmware status (pending, current, rejected, deployed)
- map_firmware_response: Convert FirmwareUpdate model to FirmwareResponse DTO
- user_can_view_firmware: Check if user has access to view a firmware
- upload_firmware: Handle firmware binary upload from developer
- get_firmware_device_types: List device types based on user role
- get_firmware_by_status: Query firmware by approval status
- get_firmware_by_id: Fetch single firmware record
- download_firmware: Stream firmware binary to user
- get_compatible_devices: List devices compatible with a firmware
- deploy_firmware: Deploy firmware to single device
- cloud_to_many_device: Deploy firmware to multiple devices
- approve_firmware: Approve pending firmware by manager
- reject_firmware: Reject pending firmware by manager
"""

import os
from datetime import datetime, timezone
from typing import Optional, List

from azure.iot.hub import IoTHubRegistryManager
from sqlalchemy.orm import Session

from models import (
    Device,
    FirmwareUpdate,
    Developer,
    DeveloperManager,
    BusinessManager,
    Deploy,
    User,
)
from iot import FirmwareOverview, deploy_helper


def get_firmware_status(firmware: FirmwareUpdate, db: Session = None) -> str:
    """Determine the current status of a firmware update."""
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
    """Convert FirmwareUpdate model to response DTO."""
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
    """Check if user has viewable access to firmware."""
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)


def get_firmware_device_types(user: User, db: Session) -> List[str]:
    """Get list of device types based on user role."""
    from routers.firmware import UserRole  # Avoid circular imports

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


def get_firmware_by_status(user: User, status: str, db: Session) -> List[FirmwareUpdate]:
    """Query firmware by status (pending, current, rejected)."""
    from routers.firmware import UserRole  # Avoid circular imports

    if status == "pending":
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.is_(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
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
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.approved_by.isnot(None),
                    FirmwareUpdate.declined_by.is_(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
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
        if user.type == UserRole.developer.value:
            records = (
                db.query(FirmwareUpdate)
                .filter(
                    FirmwareUpdate.uploaded_by == user.id,
                    FirmwareUpdate.declined_by.isnot(None),
                )
                .all()
            )
        elif user.type == UserRole.developer_manager.value:
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

    return records


def get_compatible_devices(firmware: FirmwareUpdate, db: Session) -> dict:
    """Get list of devices compatible with a firmware (matching device_type)."""
    devices = db.query(Device).filter(Device.device_type == firmware.device_type).all()
    compatible = [
        d for d in devices
        if not d.firmware or d.firmware.version_number != firmware.version_number
    ]

    all_regions = [
        "Africa", "Antarctica", "Asia", "Europe",
        "North America", "Oceania", "South America", "Unknown"
    ]

    from services.device_service import get_region_from_coordinates

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


def deploy_firmware(
    firmware_id: int,
    serial_number: str,
    is_emergency: bool,
    user: User,
    db: Session,
) -> dict:
    """Deploy firmware to a single device."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is None or firmware.declined_by is not None:
        return {"error": "Only approved firmware can be deployed"}

    device = (
        db.query(Device).filter(Device.serial_number == serial_number).first()
    )
    if not device:
        return {"error": "Device not found"}

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    )
    if not business_manager:
        return {"error": "Business manager not found"}

    # Send IoT C2D notification to device
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
            message_sent = deploy_helper(
                serial_number, iot_hub, firmware_overview
            )
            iot_notification_status = "sent" if message_sent else "failed"
        except Exception as e:
            print(f"IoT notification error: {e}")
            iot_notification_status = "failed"

    # Deactivate existing active deploy for this device
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

    # Update device firmware
    device.firmware_id = firmware_id
    device.last_update = datetime.now(timezone.utc)

    # Create new active deploy record
    deploy = Deploy(
        manager_id=business_manager.id,
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
    firmware_id: int,
    serial_numbers: List[str],
    is_emergency: bool,
    user: User,
    db: Session,
) -> dict:
    """Deploy firmware to multiple devices."""
    firmware = (
        db.query(FirmwareUpdate)
        .filter(FirmwareUpdate.id == firmware_id)
        .first()
    )
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is None or firmware.declined_by is not None:
        return {"error": "Only approved firmware can be deployed"}

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    )
    if not business_manager:
        return {"error": "Business manager not found"}

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
            manager_id=business_manager.id,
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


def approve_firmware(
    firmware_id: int,
    manager: DeveloperManager,
    db: Session,
) -> dict:
    """Approve pending firmware by developer manager."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is not None or firmware.declined_by is not None:
        return {"error": "Only pending firmware can be approved"}

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

    return {"status": "approved", "firmware": map_firmware_response(firmware, db)}


def reject_firmware(
    firmware_id: int,
    manager: DeveloperManager,
    rejection_reason: str,
    db: Session,
) -> dict:
    """Reject pending firmware by developer manager."""
    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        return {"error": "Firmware not found"}

    if firmware.approved_by is not None or firmware.declined_by is not None:
        return {"error": "Only pending firmware can be rejected"}

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

    return {"status": "rejected", "firmware": map_firmware_response(firmware, db)}
