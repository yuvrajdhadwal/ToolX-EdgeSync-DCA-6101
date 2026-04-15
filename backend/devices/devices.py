from datetime import datetime, timezone
from typing import Optional

from database.database_types import DeviceType, UserRole
from database.models import DeveloperManager, Device, FirmwareUpdate, FieldShopProfessional
from fastapi import Header, HTTPException
from login.authentication import get_authenticated_user
from map.active_devices import get_region_from_coordinates
from sqlalchemy.orm import Session


def get_deployable_devices(
    firmware_id: int,
    db: Session,
    authorization: Optional[str] = Header(default=None),
):
    user = get_authenticated_user(authorization, db)

    if user.type != UserRole.business_manager.value:  # type: ignore
        raise HTTPException(
            status_code=403, detail="Only business managers can view compatible devices"
        )

    firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    devices = db.query(Device).filter(Device.device_type == firmware.device_type).all()
    compatible = [
        d
        for d in devices
        if not d.firmware or d.firmware.version_number != firmware.version_number
    ]

    all_regions = [
        "Africa",
        "Antarctica",
        "Asia",
        "Europe",
        "North America",
        "Oceania",
        "South America",
        "Unknown",
    ]

    return {
        "devices": [
            {
                "serial_number": d.serial_number,
                "device_type": d.device_type,
                "location": d.location,
                "current_version": d.firmware.version_number if d.firmware else None,
                "region": get_region_from_coordinates(d.latitude, d.longitude),  # type: ignore
            }
            for d in compatible
        ],
        "all_regions": all_regions,
    }


def add_device(device: DeviceType, db: Session):
    existing_device = (
        db.query(Device).filter(Device.serial_number == device.serial_number).first()
    )
    if existing_device:
        raise HTTPException(
            status_code=400, detail="Device with this serial number already exists"
        )

    db_device = Device(
        serial_number=device.serial_number,
        firmware_id=None,
        device_type=device.device_type,
        location=device.location,
        developer_manager=device.developer_manager,
        description=device.description,
        latitude=device.latitude,
        longitude=device.longitude,
        last_update=datetime.now(timezone.utc),
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)

    # Updated -> Assigns Field Shop Professionals to device
    for username in device.field_shop_users:
        professional = db.query(FieldShopProfessional).filter(
            FieldShopProfessional.username == username
        ).first()

        if not professional:
            continue

        # Add to device M:N relationship
        db_device.field_shop_professionals.append(professional)

        # Also give download access to approved firmware for this device type
        approved_firmware = db.query(FirmwareUpdate).filter(
            FirmwareUpdate.device_type == device.device_type,
            FirmwareUpdate.approved_by.isnot(None),
        ).all()
        
        for fw in approved_firmware:
            if fw not in professional.download_firmware:
                professional.download_firmware.append(fw)

    db.commit()

    return {"message": "Device added successfully"}


def get_devices(db: Session):
    manager_lookup = {
        manager.id: manager.username for manager in db.query(DeveloperManager).all()
    }

    def resolve_manager_name(value: Optional[str]) -> str:
        if value is None:
            return ""
        raw_value = str(value).strip()
        if not raw_value:
            return ""
        if raw_value.isdigit():
            return manager_lookup.get(int(raw_value), raw_value)  # type: ignore
        return raw_value

    devices = db.query(Device).all()
    return [
        {
            "device_type": d.device_type,
            "version_number": d.firmware.version_number if d.firmware else "N/A",
            "last_update": (
                d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A"  # type: ignore
            ),
            "location": d.location,
            "serial_number": d.serial_number,
            "description": d.description,
            "developer_manager": resolve_manager_name(d.developer_manager),  # type: ignore
            "latitude": d.latitude,
            "longitude": d.longitude,
            "region": get_region_from_coordinates(
                d.latitude, d.longitude  # type: ignore
            ),
        }
        for d in devices
    ]


def delete_devices(serial_number: str, db: Session):
    device = db.query(Device).filter(Device.serial_number == serial_number).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted successfully"}

