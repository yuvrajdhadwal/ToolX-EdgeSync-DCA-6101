import os
import threading
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional, Set

import bcrypt
from azure.iot.hub import IoTHubRegistryManager
from backend.database.database import Base, SessionLocal, engine
from dotenv import load_dotenv
from fastapi import (Depends, FastAPI, File, Form, Header, HTTPException,
                     Response, UploadFile, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from backend.IoT.iot import (FirmwareOverview, deploy_helper, telemetry_listener)
from jose import JWTError, jwt
from backend.database.models import (BusinessManager, Deploy, Developer, DeveloperManager,
                    Device, FieldShopProfessional, FirmwareUpdate, User)
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from backend.devices.acceptance_status import update_acceptance_status

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
IOTHUB_CONNECTION_STRING = os.getenv("IOT_CONNECTION")
EVENTHUB_CONNECTION_STRING = os.getenv("EVENTHUB_CONNECTION")
ACTIVE_DEVICE_ONLINE_MESSAGE = os.getenv("ACTIVE_DEVICE_ONLINE_MESSAGE", "Device is Online")
ONLINE_DEVICE_TTL_SECONDS = int(os.getenv("ONLINE_DEVICE_TTL_SECONDS", "60"))
ACTIVE_DEVICE_RETRY_SECONDS = int(os.getenv("ACTIVE_DEVICE_RETRY_SECONDS", "5"))
DATABASE = get_db()
OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="token")


active_device_serials: Set[str] = set()
active_device_last_seen: dict[str, datetime] = {}
active_device_lock = threading.Lock()

if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}

@app.on_event("startup")
def start_active_device_worker():
    threading.Thread(target=telemetry_activity_worker, daemon=True).start()


################################################################################################################################
# Login
################################################################################################################################

@app.post("/register")
def register_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    return register_user(user, DATABASE)

@app.post("/token")
def login_with_token_endpoint(
    form_data: OAuth2PasswordRequestForm = Depends()):
    return login_with_token(form_data, DATABASE)

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
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_device_types(DATABASE, authorization)

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
):
    return upload_firmware(file, device_type, version_number, isEmergency, description, authorization, DATABASE)

@app.get("/firmware/status/{status}", response_model=List[FirmwareResponse])
def get_firmware_by_status_endpoint(
    status: str,
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_by_status(status, DATABASE, authorization)

@app.get("/firmware/{firmware_id}", response_model=FirmwareResponse)
def get_firmware_by_id_endpoint(
    firmware_id: int,
    authorization: Optional[str] = Header(default=None),
):
    return get_firmware_by_id(firmware_id, DATABASE, authorization)

@app.post("/firmware/{firmware_id}/download")
def download_firmware_endpoint(
    firmware_id: int,
    authorization: Optional[str] = Header(default=None),
):
    return download_firmware(firmware_id, DATABASE, authorization)

@app.post("/firmware/{firmware_id}/reject", response_model=FirmwareResponse)
def reject_firmware_endpoint(
    firmware_id: int,
    payload: RejectFirmwareRequest,
    authorization: Optional[str] = Header(default=None),
):
    return reject_firmware(firmware_id, payload, DATABASE, authorization)

@app.post("/firmware/{firmware_id}/approve", response_model=FirmwareResponse)
def approve_firmware_endpoint(
    firmware_id: int,
    payload: ApproveFirmwareRequest,
    authorization: Optional[str] = Header(default=None),
):
    return approve_firmware(firmware_id, DATABASE, payload, authorization)
    

################################################################################################################################
# Device
################################################################################################################################

@app.post("/add_device")
def add_device_endpoint(device: DeviceCreate):
    add_device(device, DATABASE)

@app.get("/get_devices")
def get_devices_endpoint():
    return get_devices(DATABASE)

@app.get("/device/{serial_number}/deploy-history")
def get_deploy_history_endpoint(
    serial_number: str,
):
    return get_deploy_history(serial_number, DATABASE)

@app.delete("/remove_device/{serial_number}")
def delete_device_endpoint(serial_number: str):
    return delete_device(serial_number, DATABASE)

################################################################################################################################
# Deployment
################################################################################################################################

@app.post("/deploy-to-many-devices")
def cloud_to_many_device(
    payload: DeployManyRequest,
    authorization: Optional[str] = Header(default=None),
):
    return deploy_to_devices(payload, DATABASE, authorization)
    
@app.get("/firmware/{firmware_id}/compatible-devices")
def get_compatible_devices(
    firmware_id: int,
    authorization: Optional[str] = Header(default=None),
):
    return get_deployable_devices(firmware_id, DATABASE, authorization)

################################################################################################################################
# Map
################################################################################################################################

@app.get("/get_online_devices")
def get_online_devices():
    return get_active_devices(DATABASE)

################################################################################################################################
# Helpers
################################################################################################################################

@app.get("/devmng")
def get_devmng():
    return get_developer_manager(DATABASE)

@app.get("/users/{user_id}/username")
def get_username_by_id_endpoint(
    user_id: int,
    authorization: Optional[str] = Header(default=None),
):
    return get_username_by_id(user_id, DATABASE, authorization)
    