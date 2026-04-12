
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional, Set

from azure.iot.hub import IoTHubRegistryManager
from database import Base, SessionLocal, engine
from dotenv import load_dotenv
from fastapi import (Depends, FastAPI, File, Form, Header, HTTPException,
                     Response, UploadFile, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from iot import (FirmwareOverview, deploy_helper, telemetry_listener)
from jose import JWTError, jwt
from models import (BusinessManager, Deploy, Developer, DeveloperManager,
                    Device, FieldShopProfessional, FirmwareUpdate, User)
from pydantic import BaseModel
from routers.auth import router as auth_router
from routers.devices import router as devices_router
from routers.firmware import router as firmware_router
from sqlalchemy.orm import Session
from acceptance_status import update_acceptance_status
from verification.security import (
    create_access_token,
    get_authenticated_user,
    get_token_payload_from_header,
    oauth2_scheme,
    require_developer_manager,
    verify_token,
)

app = FastAPI()
app.include_router(auth_router)
app.include_router(devices_router)
app.include_router(firmware_router)
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


@app.get("/devmng")
def get_devmng(db: Session = Depends(get_db)):
    managers = db.query(DeveloperManager).all()
    return [{"id": mng.id, "username": mng.username} for mng in managers]


@app.get("/users/{user_id}/username")
def get_username_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    get_authenticated_user(authorization, db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username}


if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"error": "Frontend not deployed"}
