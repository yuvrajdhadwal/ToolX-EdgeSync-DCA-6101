import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Deploy, DeveloperManager, Device, FirmwareUpdate, FieldShopProfessional

ONLINE_DEVICE_TTL_SECONDS = int(os.getenv("ONLINE_DEVICE_TTL_SECONDS", "60"))


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


def add_device(
	db: Session,
	serial_number: str,
	device_type: str,
	description: str,
	location: str,
	developer_manager: str,
	latitude: Optional[float],
	longitude: Optional[float],
	field_shop_professionals: Optional[list[int]] = None
):
	existing_device = db.query(Device).filter(Device.serial_number == serial_number).first()
	if existing_device:
		raise HTTPException(
			status_code=400, detail="Device with this serial number already exists"
		)

	db_device = Device(
		serial_number=serial_number,
		firmware_id=None,
		device_type=device_type,
		location=location,
		developer_manager=developer_manager,
		description=description,
		latitude=latitude,
		longitude=longitude,
		last_update=datetime.now(timezone.utc),
	)

	if field_shop_professionals:
		professionals = db.query(FieldShopProfessional).filter(
            FieldShopProfessional.id.in_(field_shop_professionals)
        ).all()
		db_device.assigned_professionals = professionals

	db.add(db_device)
	db.commit()
	db.refresh(db_device)
	return {"message": "Device added successfully"}


def _resolve_manager_name(value: Optional[str], manager_lookup: dict[int, str]) -> str:
	if value is None:
		return ""
	raw_value = str(value).strip()
	if not raw_value:
		return ""
	if raw_value.isdigit():
		return manager_lookup.get(int(raw_value), raw_value)
	return raw_value


def get_devices(db: Session):
	manager_lookup = {
		manager.id: manager.username for manager in db.query(DeveloperManager).all()
	}

	devices = db.query(Device).all()
	return [
		{
			"device_type": d.device_type,
			"version_number": d.firmware.version_number if d.firmware else "N/A",
			"last_update": (
				d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A"
			),
			"location": d.location,
			"serial_number": d.serial_number,
			"description": d.description,
			"developer_manager": _resolve_manager_name(d.developer_manager, manager_lookup),
			"latitude": d.latitude,
			"longitude": d.longitude,
			"region": get_region_from_coordinates(d.latitude, d.longitude),
		}
		for d in devices
	]


def get_online_devices(db: Session):
	cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_DEVICE_TTL_SECONDS)

	manager_lookup = {
		manager.id: manager.username for manager in db.query(DeveloperManager).all()
	}

	devices = (
		db.query(Device)
		.filter(Device.last_online.is_not(None), Device.last_online >= cutoff)
		.all()
	)

	return [
		{
			"device_type": d.device_type,
			"version_number": d.firmware.version_number if d.firmware else "N/A",
			"last_update": (
				d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A"
			),
			"location": d.location,
			"serial_number": d.serial_number,
			"description": d.description,
			"developer_manager": _resolve_manager_name(d.developer_manager, manager_lookup),
			"latitude": d.latitude,
			"longitude": d.longitude,
			"region": get_region_from_coordinates(d.latitude, d.longitude),
		}
		for d in devices
	]


def get_deploy_history(db: Session, serial_number: str):
	device = db.query(Device).filter(Device.serial_number == serial_number).first()
	if not device:
		raise HTTPException(status_code=404, detail="Device not found")

	deploys = (
		db.query(Deploy)
		.filter(Deploy.device_serial == serial_number)
		.order_by(Deploy.timestamp.desc())
		.all()
	)

	return [
		{
			"id": d.id,
			"firmware_version": db.query(FirmwareUpdate)
			.filter(FirmwareUpdate.id == d.target_firmware_id)
			.first()
			.version_number,
			"timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M"),
			"isActive": d.isActive,
		}
		for d in deploys
	]


def delete_device(db: Session, serial_number: str):
	device = db.query(Device).filter(Device.serial_number == serial_number).first()
	if not device:
		raise HTTPException(status_code=404, detail="Device not found")
	db.delete(device)
	db.commit()
	return {"message": "Device deleted successfully"}
