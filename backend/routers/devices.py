from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from database import SessionLocal
from services import device_service

router = APIRouter()


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


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
	return device_service.add_device(
		db=db,
		serial_number=device.serial_number,
		device_type=device.device_type,
		description=device.description,
		location=device.location,
		developer_manager=device.developer_manager,
		latitude=device.latitude,
		longitude=device.longitude,
	)


@router.get("/get_devices")
def get_devices(db: Session = Depends(get_db)):
	return device_service.get_devices(db)


@router.get("/get_online_devices")
def get_online_devices(db: Session = Depends(get_db)):
	return device_service.get_online_devices(db)


@router.get("/device/{serial_number}/deploy-history")
def get_deploy_history(
	serial_number: str,
	db: Session = Depends(get_db),
):
	return device_service.get_deploy_history(db, serial_number)


@router.delete("/remove_device/{serial_number}")
def delete_device(serial_number: str, db: Session = Depends(get_db)):
	return device_service.delete_device(db, serial_number)
