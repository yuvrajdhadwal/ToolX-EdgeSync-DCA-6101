import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from azure.iot.hub import IoTHubRegistryManager
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from config import ACTIVE_DEVICE_ONLINE_MESSAGE, ONLINE_DEVICE_TTL_SECONDS
from database.database import SessionLocal
from database.models import Deploy, DeveloperManager, Device, FirmwareUpdate
from firmware.firmware_types import FirmwareOverview
from IoT.deployment import deploy_cloud_to_device


def get_region_from_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
) -> str:
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


def _record_device_activity(device_id: str, body: str):
    if ACTIVE_DEVICE_ONLINE_MESSAGE.lower() not in body.lower():
        return

    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.serial_number == device_id).first()
        if not device:
            return

        device.last_online = datetime.now(timezone.utc)  # type: ignore
        db.commit()
    finally:
        db.close()


def check_pending_deployments(device_id: str):
    db = SessionLocal()
    try:
        pending_deploy = (
            db.query(Deploy)
            .filter(
                or_(Deploy.isAccepted.is_(None), Deploy.isAccepted == False),
                Deploy.device_serial == device_id,
            )
            .order_by(desc(Deploy.timestamp))
            .first()
        )

        ever_accepted_firmware = (
            db.query(Deploy)
            .filter(
                Deploy.isAccepted == True,
                Deploy.device_serial == device_id,
            )
            .first()
        )

        if ever_accepted_firmware and pending_deploy:
            return pending_deploy
        return None
    finally:
        db.close()


def _redeploy_firmware(db: Session):
    all_devices = db.query(Device).all()

    connection_str = os.getenv("IOT_CONNECTION")
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)

    for device in all_devices:
        pending_deploy = check_pending_deployments(device.serial_number)

        if not pending_deploy:
            continue

        firmware = (
            db.query(FirmwareUpdate)
            .filter(FirmwareUpdate.id == pending_deploy.target_firmware_id)
            .first()
        )

        firmware_overview = FirmwareOverview(
            id=str(firmware.id),
            device_type=firmware.device_type,
            developer=str(firmware.uploaded_by or ""),
            version_number=firmware.version_number,
            isEmergency=(
                "1"
                if (bool(firmware.isEmergency) or pending_deploy.isEmergency)
                else "0"
            ),
            description=firmware.description or "",
        )

        deploy_cloud_to_device(device.serial_number, iot_hub, firmware_overview)


def get_active_devices(db: Session):
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_DEVICE_TTL_SECONDS)

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
            return manager_lookup.get(int(raw_value), raw_value)
        return raw_value

    devices = (
        db.query(Device)
        .filter(Device.last_online.is_not(None), Device.last_online >= cutoff)
        .all()
    )

    _redeploy_firmware(db)

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
            "region": get_region_from_coordinates(d.latitude, d.longitude),  # type: ignore
        }
        for d in devices
    ]
