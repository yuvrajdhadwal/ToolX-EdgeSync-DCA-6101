import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Deploy, DeveloperManager, Device, FirmwareUpdate

router = APIRouter()
ONLINE_DEVICE_TTL_SECONDS = int(os.getenv("ONLINE_DEVICE_TTL_SECONDS", "60"))


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


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


class DeviceCreate(BaseModel):
	serial_number: str
	device_type: str
	version_number: Optional[str] = None
	description: str
	location: str
	developer_manager: str
	longitude: Optional[float] = None
	latitude: Optional[float] = None

	@field_validator(
		"device_type",
		"serial_number",
		"version_number",
		"description",
		"location",
		"developer_manager",
	)
	@classmethod
	def fields_must_not_be_empty(cls, v):
		if not v.strip():
			raise ValueError("Field must not be empty")
		return v

	@field_validator("latitude")
	@classmethod
	def latitude_must_be_valid(cls, value: Optional[float]):
		if value is None:
			return value
		if value < -90 or value > 90:
			raise ValueError("Latitude must be between -90 and 90")
		return value

	@field_validator("longitude")
	@classmethod
	def longitude_must_be_valid(cls, value: Optional[float]):
		if value is None:
			return value
		if value < -180 or value > 180:
			raise ValueError("Longitude must be between -180 and 180")
		return value


@router.post("/add_device")
def add_device(device: DeviceCreate, db: Session = Depends(get_db)):
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
	return {"message": "Device added successfully"}


@router.get("/get_devices")
def get_devices(db: Session = Depends(get_db)):
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
			"developer_manager": resolve_manager_name(d.developer_manager),
			"latitude": d.latitude,
			"longitude": d.longitude,
			"region": get_region_from_coordinates(d.latitude, d.longitude),
		}
		for d in devices
	]


@router.get("/get_online_devices")
def get_online_devices(db: Session = Depends(get_db)):
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
			"developer_manager": resolve_manager_name(d.developer_manager),
			"latitude": d.latitude,
			"longitude": d.longitude,
			"region": get_region_from_coordinates(d.latitude, d.longitude),
		}
		for d in devices
	]


@router.get("/device/{serial_number}/deploy-history")
def get_deploy_history(
	serial_number: str,
	db: Session = Depends(get_db),
):
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


@router.delete("/remove_device/{serial_number}")
def delete_device(serial_number: str, db: Session = Depends(get_db)):
	device = db.query(Device).filter(Device.serial_number == serial_number).first()
	if not device:
		raise HTTPException(status_code=404, detail="Device not found")
	db.delete(device)
	db.commit()
	return {"message": "Device deleted successfully"}
