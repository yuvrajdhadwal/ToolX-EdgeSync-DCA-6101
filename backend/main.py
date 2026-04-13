import os
import threading
from datetime import datetime
from typing import List, Optional, Set
from database.database import Base, engine, SessionLocal
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database.database_types import UserType, DeviceType
from database.database_helpers import get_developer_manager, get_username_by_id
from firmware.firmware_types import FirmwareResponse
from IoT.device_to_cloud import telemetry_activity_worker
from IoT.iot_types import DeployManyRequest
from IoT.deployment import deploy_to_devices
from login.registration import register_user
from login.authentication import login_with_token, verify_token
from login.isolation import get_firmware_device_types
from firmware.upload_and_download import upload_firmware, download_firmware
from firmware.firmware import get_firmware_by_status, get_firmware_by_id
from firmware.firmware_types import RejectFirmwareRequest, ApproveFirmwareRequest
from firmware.manager_approval import reject_firmware, approve_firmware
from devices.devices import add_device, get_devices, get_deployable_devices, delete_devices
from devices.deployment_history import get_deploy_history
from map.active_devices import get_active_devices

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
Base.metadata.create_all(bind=engine)
load_dotenv()

origins = [
    os.getenv("LOCAL_ORIGIN", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_device_serials: Set[str] = set()
active_device_last_seen: dict[str, datetime] = {}
active_device_lock = threading.Lock()

if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")



@app.on_event("startup")
def start_active_device_worker():
    threading.Thread(target=telemetry_activity_worker, daemon=True).start()


################################################################################################################################
# Login
################################################################################################################################

@app.post("/register")
def register_user_endpoint(user: UserType, db: Session = Depends(get_db)):
    return register_user(user, db)

@app.post("/token")
def login_with_token_endpoint(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)):
    return login_with_token(form_data, db)

@app.get("/verify-token/{token}")
async def verify_user_token(token: str):
    payload = verify_token(token=token)
    return {
        "message": "Token is valid",
        "user": payload.get("sub"),
        "role": payload.get("role"),
    }

@app.get("/firmware-device-types", response_model=List[str])
def get_firmware_device_types_endpoint(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_device_types(db, authorization)

################################################################################################################################
# Firmware
################################################################################################################################

@app.post("/upload")
async def upload_firmware_endpoint(
    file: UploadFile = File(...),
    device_type: str = Form(...),
    version_number: str = Form(...),
    isEmergency: bool = Form(...),
    description: str = Form(...),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    return await upload_firmware(file, device_type, version_number, isEmergency, description, authorization, db)

@app.get("/firmware/status/{status}", response_model=List[FirmwareResponse])
def get_firmware_by_status_endpoint(
    status: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_by_status(status, db, authorization)

@app.get("/firmware/{firmware_id}", response_model=FirmwareResponse)
def get_firmware_by_id_endpoint(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_by_id(firmware_id, db, authorization)

@app.post("/firmware/{firmware_id}/download")
def download_firmware_endpoint(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return download_firmware(firmware_id, db, authorization)

@app.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware_endpoint(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return reject_firmware(firmware_id, payload, db, authorization)

@app.post("/firmware/{firmware_id}/approve", response_model=FirmwareResponse)
def approve_firmware_endpoint(
    firmware_id: int,
    payload: ApproveFirmwareRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return approve_firmware(firmware_id, payload, db, authorization)
    

################################################################################################################################
# Device
################################################################################################################################

@app.post("/add_device")
def add_device_endpoint(device: DeviceType, db: Session = Depends(get_db)):
    add_device(device, db)

@app.get("/get_devices")
def get_devices_endpoint(db: Session = Depends(get_db)):
    return get_devices(db)

@app.get("/device/{serial_number}/deploy-history")
def get_deploy_history_endpoint(
    serial_number: str,
    db: Session = Depends(get_db),
):
    return get_deploy_history(serial_number, db)

@app.delete("/remove_device/{serial_number}")
def delete_device_endpoint(serial_number: str, db: Session = Depends(get_db)):
    return delete_devices(serial_number, db)

################################################################################################################################
# Deployment
################################################################################################################################

@app.post("/deploy-to-many-devices")
def cloud_to_many_device(
    payload: DeployManyRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return deploy_to_devices(payload, db, authorization)
    
@app.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
    firmware_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return get_deployable_devices(firmware_id, db, authorization)

################################################################################################################################
# Map
################################################################################################################################

@app.get("/get_online_devices")
def get_online_devices(db: Session = Depends(get_db)):
    return get_active_devices(db)

################################################################################################################################
# Helpers
################################################################################################################################

@app.get("/devmng")
def get_devmng(db: Session = Depends(get_db)):
    return get_developer_manager(db)

@app.get("/users/{user_id}/username")
def get_username_by_id_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    return get_username_by_id(user_id, db, authorization)
    

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}