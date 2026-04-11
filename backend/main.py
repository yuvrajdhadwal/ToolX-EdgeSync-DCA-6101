"""
Expected functionality:
- FastAPI app bootstrap and wiring only.
- CORS, static file serving, router inclusion, and startup hooks.

Expected functions to be added:
- None

Expected functions to be removed:
- get_db
- get_region_from_coordinates
- _record_device_activity
- telemetry_activity_worker
- telemetry_install_accept_worker
- start_active_device_worker
- start_firmware_worker
- UserRole
- UserCreate
- FirmwareCreate
- DeviceCreate
- DeployFirmwareRequest
- DeployManyRequest
- get_user_by_username
- get_devmng
- create_user
- deploy_firmware
- cloud_to_many_device
- get_compatible_devices
- upload_firmware
- add_device
- get_devices
- get_online_devices
- get_deploy_history
- delete_device
- register_user
- authenticate_user
- create_access_token
- login_for_access_token
- verify_token
- get_token_payload_from_header
- get_authenticated_user
- user_can_view_firmware
- require_developer_manager
- get_username_by_id
- verify_user_token
- FirmwareResponse
- RejectFirmwareRequest
- ApproveFirmwareRequest
- get_firmware_status
- map_firmware_response
- get_firmware_device_types
- get_firmware_by_status
- get_firmware_by_id
- download_firmware
- reject_firmware
- approve_firmware
- serve_react_app
"""

import os
import threading
import time
from datetime import datetime, timezone
from typing import Set

from database import Base, SessionLocal, engine
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from iot import telemetry_listener
from models import Device
from routers.auth import router as auth_router
from routers.devices import router as devices_router
from routers.firmware import router as firmware_router
from routers.users import router as users_router
from acceptance_status import update_acceptance_status

app = FastAPI()
app.include_router(auth_router)
app.include_router(devices_router)
app.include_router(firmware_router)
app.include_router(users_router)
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

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
IOTHUB_CONNECTION_STRING = os.getenv("IOT_CONNECTION")
EVENTHUB_CONNECTION_STRING = os.getenv("EVENTHUB_CONNECTION")
ACTIVE_DEVICE_ONLINE_MESSAGE = os.getenv("ACTIVE_DEVICE_ONLINE_MESSAGE", "Device is Online")
ONLINE_DEVICE_TTL_SECONDS = int(os.getenv("ONLINE_DEVICE_TTL_SECONDS", "60"))
ACTIVE_DEVICE_RETRY_SECONDS = int(os.getenv("ACTIVE_DEVICE_RETRY_SECONDS", "5"))

active_device_serials: Set[str] = set()
active_device_last_seen: dict[str, datetime] = {}
active_device_lock = threading.Lock()


def _record_device_activity(device_id: str, body: str):
    if ACTIVE_DEVICE_ONLINE_MESSAGE.lower() not in body.lower():
        return

    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.serial_number == device_id).first()
        if not device:
            return

        device.last_online = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def telemetry_activity_worker():
    if not EVENTHUB_CONNECTION_STRING:
        return

    while True:
        try:
            telemetry_listener(on_activity=_record_device_activity)
        except Exception as ex:
            print(f"Active-device telemetry listener error: {ex}")

def telemetry_install_accept_worker():
    if not EVENTHUB_CONNECTION_STRING:
        return

    while True:
        try:
            telemetry_listener(on_activity=update_acceptance_status)
        except Exception as ex:
            print(f"Firmware telemetry listener error: {ex}")
            

@app.on_event("startup")
def start_active_device_worker():
    threading.Thread(target=telemetry_activity_worker, daemon=True).start()

@app.on_event("startup")
def start_firmware_worker():
    threading.Thread(target=telemetry_install_accept_worker, daemon=True).start()

if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}
