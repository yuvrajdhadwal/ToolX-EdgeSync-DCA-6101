import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from azure.iot.hub import IoTHubRegistryManager
from fastapi import (APIRouter, Depends, File, Form, Header, HTTPException,
					 Response, UploadFile)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security import get_authenticated_user, require_developer_manager
from database import SessionLocal
from iot import FirmwareOverview, deploy_helper
from models import (BusinessManager, Deploy, Developer, DeveloperManager, Device,
					FirmwareUpdate, User)

router = APIRouter()


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


class UserRole(str, Enum):
	developer = "developer"
	developer_manager = "developer_manager"
	business_manager = "business_manager"
	field_shop_professional = "field_shop_professional"


class DeployFirmwareRequest(BaseModel):
	serial_number: str
	isEmergency: bool = False


class DeployManyRequest(BaseModel):
	serial_numbers: List[str]
	firmware_id: int
	isEmergency: bool = False


class FirmwareResponse(BaseModel):
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


class RejectFirmwareRequest(BaseModel):
	rejecting_manager_username: str
	rejection_reason: str


class ApproveFirmwareRequest(BaseModel):
	confirmation_text: str


def user_can_view_firmware(user: User, firmware_id: int) -> bool:
	return any(firmware.id == firmware_id for firmware in user.viewable_firmware)


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


def get_firmware_status(firmware: FirmwareUpdate, db: Session = None) -> str:
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


@router.post("/firmware/{firmware_id}/deploy-to-one-device")
def deploy_firmware(
	firmware_id: int,
	payload: DeployFirmwareRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != UserRole.business_manager.value:
		raise HTTPException(
			status_code=403, detail="Only business managers can deploy firmware"
		)

	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if firmware.approved_by is None or firmware.declined_by is not None:
		raise HTTPException(
			status_code=400, detail="Only approved firmware can be deployed"
		)

	device = (
		db.query(Device).filter(Device.serial_number == payload.serial_number).first()
	)
	if not device:
		raise HTTPException(status_code=404, detail="Device not found")

	business_manager = (
		db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
	)
	if not business_manager:
		raise HTTPException(status_code=404, detail="Business manager not found")

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
				isEmergency="1" if (firmware.isEmergency or payload.isEmergency) else "0",
				description=firmware.description or "",
			)
			message_sent = deploy_helper(payload.serial_number, iot_hub, firmware_overview)
			iot_notification_status = "sent" if message_sent else "failed"
		except Exception as e:
			print(f"IoT notification error: {e}")
			iot_notification_status = "failed"

	existing_deploy = (
		db.query(Deploy)
		.filter(
			Deploy.device_serial == payload.serial_number,
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
		device_serial=device.serial_number,
		device_firmware_id=firmware_id,
		timestamp=datetime.now(timezone.utc),
		isActive=True,
		isEmergency=payload.isEmergency,
	)
	db.add(deploy)
	db.commit()

	return {
		"message": f"Firmware successfully deployed to device {payload.serial_number}",
		"iot_notification": iot_notification_status,
	}


@router.post("/deploy-to-many-devices")
def cloud_to_many_device(
	payload: DeployManyRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != UserRole.business_manager.value:
		raise HTTPException(
			status_code=403, detail="Only business managers can deploy firmware"
		)

	firmware = (
		db.query(FirmwareUpdate)
		.filter(FirmwareUpdate.id == payload.firmware_id)
		.first()
	)
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if firmware.approved_by is None or firmware.declined_by is not None:
		raise HTTPException(
			status_code=400, detail="Only approved firmware can be deployed"
		)

	business_manager = (
		db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
	)
	if not business_manager:
		raise HTTPException(status_code=404, detail="Business manager not found")

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
		isEmergency="1" if (firmware.isEmergency or payload.isEmergency) else "0",
		description=firmware.description or "",
	)

	results = []
	for serial in payload.serial_numbers:
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

		device.firmware_id = payload.firmware_id
		device.last_update = datetime.now(timezone.utc)

		deploy = Deploy(
			manager_id=business_manager.id,
			target_firmware_id=payload.firmware_id,
			device_serial=serial,
			device_firmware_id=payload.firmware_id,
			timestamp=datetime.now(timezone.utc),
			isActive=True,
			isEmergency=payload.isEmergency,
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


@router.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != UserRole.business_manager.value:
		raise HTTPException(status_code=403, detail="Only business managers can view compatible devices")

	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

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


@router.post("/upload")
async def upload_firmware(
	file: UploadFile = File(...),
	device_type: str = Form(...),
	version_number: str = Form(...),
	isEmergency: bool = Form(...),
	description: str = Form(...),
	authorization: Optional[str] = Header(default=None),
	db: Session = Depends(get_db),
):
	if not authorization:
		raise HTTPException(
			status_code=401, detail="Missing or invalid authorization header"
		)

	authenticated_user = get_authenticated_user(authorization, db)
	if authenticated_user.type != UserRole.developer.value:
		raise HTTPException(
			status_code=403, detail="Only developers can upload firmware"
		)

	developer_user = (
		db.query(Developer).filter(Developer.id == authenticated_user.id).first()
	)
	if not developer_user:
		raise HTTPException(status_code=404, detail="Developer not found")

	if developer_user.manager_id is None:
		raise HTTPException(
			status_code=400, detail="Developer does not have an assigned manager"
		)

	manager_user = (
		db.query(DeveloperManager)
		.filter(DeveloperManager.id == developer_user.manager_id)
		.first()
	)
	if not manager_user:
		raise HTTPException(status_code=404, detail="Developer manager not found")
	if not file.filename or not file.filename.lower().endswith(".bin"):
		raise HTTPException(status_code=400, detail="Only .bin files can be uploaded")

	file_content = await file.read()
	firmware = FirmwareUpdate(
		objectBinary=file_content,
		version_number=version_number,
		device_type=device_type,
		description=description,
		uploaded_by=developer_user.id,
		isEmergency=isEmergency,
	)

	manager_user.viewable_firmware.append(firmware)

	db.add(firmware)
	db.commit()
	db.refresh(firmware)
	return {"message": "upload successful"}


@router.get("/firmware-device-types", response_model=List[str])
def get_firmware_device_types(
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

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
		device_types = [
			device_type
			for (device_type,) in db.query(FirmwareUpdate.device_type)
			.distinct()
			.order_by(FirmwareUpdate.device_type)
			.all()
		]

	return device_types


@router.get("/firmware/status/{status}", response_model=List[FirmwareResponse])
def get_firmware_by_status(
	status: str,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if status not in {"current", "pending", "rejected"}:
		raise HTTPException(
			status_code=400,
			detail="Invalid status. Use 'pending', 'current', or 'rejected'",
		)

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
			records = (
				db.query(FirmwareUpdate)
				.filter(
					FirmwareUpdate.approved_by.isnot(None),
					FirmwareUpdate.declined_by.is_(None),
				)
				.all()
			)

	else:
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
			records = (
				db.query(FirmwareUpdate)
				.filter(
					FirmwareUpdate.declined_by.isnot(None),
				)
				.all()
			)

	return [map_firmware_response(record) for record in records]


@router.get("/firmware/{firmware_id}", response_model=FirmwareResponse)
def get_firmware_by_id(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)
	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()

	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if user.type == UserRole.business_manager.value:
		return map_firmware_response(firmware)

	if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
		raise HTTPException(status_code=404, detail="Firmware not found")

	return map_firmware_response(firmware)


@router.post("/firmware/{firmware_id}/download")
def download_firmware(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)
	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if user.type == UserRole.business_manager.value:
		return Response(
			content=firmware.objectBinary,
			media_type="application/octet-stream",
			headers={
				"Content-Disposition": f"attachment; filename=firmware_{firmware.id}.bin"
			},
		)

	if not user_can_view_firmware(user, firmware.id) and firmware.uploaded_by != user.id:
		raise HTTPException(status_code=404, detail="Firmware not found")

	return Response(
		content=firmware.objectBinary,
		media_type="application/octet-stream",
		headers={
			"Content-Disposition": f"attachment; filename=firmware_{firmware.id}.bin"
		},
	)


@router.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware(
	firmware_id: int,
	payload: RejectFirmwareRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	token_username = require_developer_manager(authorization)

	if (
		payload.rejecting_manager_username.strip().lower()
		!= token_username.strip().lower()
	):
		raise HTTPException(
			status_code=403,
			detail="Rejecting manager must match the authenticated user",
		)

	if not payload.rejection_reason.strip():
		raise HTTPException(status_code=400, detail="Rejection reason is required")

	manager = (
		db.query(DeveloperManager)
		.filter(DeveloperManager.username == token_username)
		.first()
	)
	if not manager:
		raise HTTPException(status_code=404, detail="Developer manager not found")

	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if firmware.approved_by is not None or firmware.declined_by is not None:
		raise HTTPException(
			status_code=400, detail="Only pending firmware can be rejected"
		)

	if not any(viewable.id == firmware.id for viewable in manager.viewable_firmware):
		manager.viewable_firmware.append(firmware)

	uploader = db.query(Developer).filter(Developer.id == firmware.uploaded_by).first()
	if uploader and not any(
		viewable.id == firmware.id for viewable in uploader.viewable_firmware
	):
		uploader.viewable_firmware.append(firmware)

	firmware.declined_by = manager.id
	firmware.declined_comment = payload.rejection_reason.strip()

	db.commit()
	db.refresh(firmware)

	return map_firmware_response(firmware)


@router.post("/firmware/{firmware_id}/approve", response_model=FirmwareResponse)
def approve_firmware(
	firmware_id: int,
	payload: ApproveFirmwareRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	token_username = require_developer_manager(authorization)

	if payload.confirmation_text.strip().upper() != "CONFIRM":
		raise HTTPException(status_code=400, detail="Type CONFIRM to approve firmware")

	manager = (
		db.query(DeveloperManager)
		.filter(DeveloperManager.username == token_username)
		.first()
	)
	if not manager:
		raise HTTPException(status_code=404, detail="Developer manager not found")

	firmware = db.query(FirmwareUpdate).filter(FirmwareUpdate.id == firmware_id).first()
	if not firmware:
		raise HTTPException(status_code=404, detail="Firmware not found")

	if firmware.approved_by is not None or firmware.declined_by is not None:
		raise HTTPException(
			status_code=400, detail="Only pending firmware can be approved"
		)

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
