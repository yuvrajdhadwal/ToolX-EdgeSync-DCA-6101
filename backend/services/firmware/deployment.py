import os
from datetime import datetime, timezone
from typing import List

from azure.iot.hub import IoTHubRegistryManager
from sqlalchemy.orm import Session

from iot import FirmwareOverview, deploy_helper
from models import BusinessManager, Deploy, Device, FirmwareUpdate
from services.device_service import get_region_from_coordinates


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
