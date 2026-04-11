from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.security import get_authenticated_user, require_developer_manager
from database import SessionLocal
from services.firmware import (
    approve_firmware,
    cloud_to_many_device,
    deploy_firmware,
    download_firmware,
    get_compatible_devices,
    get_firmware_by_id,
    get_firmware_by_status,
    get_firmware_device_types,
    reject_firmware,
    upload_firmware,
)

router = APIRouter()


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


class DeployFirmwareRequest(BaseModel):
	serial_number: str
	isEmergency: bool = False


class DeployManyRequest(BaseModel):
	serial_numbers: List[str]
	firmware_id: int
	isEmergency: bool = False


class RejectFirmwareRequest(BaseModel):
	rejecting_manager_username: str
	rejection_reason: str


class ApproveFirmwareRequest(BaseModel):
	confirmation_text: str


@router.post("/firmware/{firmware_id}/deploy-to-one-device")
def deploy_firmware(
	firmware_id: int,
	payload: DeployFirmwareRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != "business_manager":
		raise HTTPException(
			status_code=403, detail="Only business managers can deploy firmware"
		)

	try:
		result = deploy_firmware(
			db=db,
			firmware_id=firmware_id,
			serial_number=payload.serial_number,
			business_manager_id=user.id,
			is_emergency=payload.isEmergency,
		)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/deploy-to-many-devices")
def cloud_to_many_device(
	payload: DeployManyRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != "business_manager":
		raise HTTPException(
			status_code=403, detail="Only business managers can deploy firmware"
		)

	try:
		result = cloud_to_many_device(
			db=db,
			firmware_id=payload.firmware_id,
			serial_numbers=payload.serial_numbers,
			business_manager_id=user.id,
			is_emergency=payload.isEmergency,
		)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	if user.type != "business_manager":
		raise HTTPException(status_code=403, detail="Only business managers can view compatible devices")

	try:
		result = get_compatible_devices(db=db, firmware_id=firmware_id)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


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
	if authenticated_user.type != "developer":
		raise HTTPException(
			status_code=403, detail="Only developers can upload firmware"
		)

	if not file.filename or not file.filename.lower().endswith(".bin"):
		raise HTTPException(status_code=400, detail="Only .bin files can be uploaded")

	file_content = await file.read()

	try:
		result = await upload_firmware(
			db=db,
			file_content=file_content,
			device_type=device_type,
			version_number=version_number,
			is_emergency=isEmergency,
			description=description,
			developer_id=authenticated_user.id,
		)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/firmware-device-types", response_model=List[str])
def get_firmware_device_types(
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)
	return get_firmware_device_types(db=db, user=user)


@router.get("/firmware/status/{status}")
def get_firmware_by_status(
	status: str,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)

	try:
		results = get_firmware_by_status(db=db, status=status, user=user)
		return results
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/firmware/{firmware_id}")
def get_firmware_by_id(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)
	try:
		result = get_firmware_by_id(db=db, firmware_id=firmware_id, user=user)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/firmware/{firmware_id}/download")
def download_firmware(
	firmware_id: int,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	user = get_authenticated_user(authorization, db)
	try:
		content = download_firmware(db=db, firmware_id=firmware_id, user=user)
		return Response(
			content=content,
			media_type="application/octet-stream",
			headers={
				"Content-Disposition": f"attachment; filename=firmware_{firmware_id}.bin"
			},
		)
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/firmware/{firmware_id}/reject")
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

	user = get_authenticated_user(authorization, db)

	try:
		result = reject_firmware(
			db=db,
			firmware_id=firmware_id,
			manager_id=user.id,
			rejecting_manager_username=payload.rejecting_manager_username,
			rejection_reason=payload.rejection_reason,
		)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/firmware/{firmware_id}/approve")
def approve_firmware(
	firmware_id: int,
	payload: ApproveFirmwareRequest,
	db: Session = Depends(get_db),
	authorization: Optional[str] = Header(default=None),
):
	token_username = require_developer_manager(authorization)

	if payload.confirmation_text.strip().upper() != "CONFIRM":
		raise HTTPException(status_code=400, detail="Type CONFIRM to approve firmware")

	user = get_authenticated_user(authorization, db)

	try:
		result = approve_firmware(
			db=db,
			firmware_id=firmware_id,
			manager_id=user.id,
		)
		return result
	except ValueError as e:
		if "not found" in str(e).lower():
			raise HTTPException(status_code=404, detail=str(e))
		raise HTTPException(status_code=400, detail=str(e))
