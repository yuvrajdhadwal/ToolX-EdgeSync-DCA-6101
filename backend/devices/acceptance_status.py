from datetime import datetime, timezone
import os
from time import sleep
from threading import Thread
from firmware.firmware_types import FirmwareOverview
from IoT.deployment import deploy_cloud_to_device

from azure.iot.hub import IoTHubRegistryManager
from database.database import SessionLocal
from database.models import Deploy, Device, FirmwareUpdate
from fastapi import HTTPException
from sqlalchemy.orm import Session

reject_Delay = 30

def update_acceptance_status(device_id: str, body: str):
    if "Success" in body:
        accepted = True
    elif "Rejected" in body:
        accepted = False
    else:
        return

    db = SessionLocal()
    rejected_deploy_id = None
    try:
        deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == device_id,
                Deploy.isAccepted == None,
            )
            .order_by(Deploy.timestamp.desc())
            .first()
        )

        if not deploy:
            print(f"[{device_id}] No active deployment found")
            return

        deploy.isAccepted = accepted  # type: ignore
        if not accepted:
            rejected_deploy_id = deploy.id
        if accepted:
            previous = (
                db.query(Deploy)
                .filter(
                    Deploy.device_serial == device_id,
                    Deploy.isActive == True,
                )
                .first()
            )
            if previous:
                previous.isActive = False

            deploy.isActive = True

            device = db.query(Device).filter(Device.serial_number == device_id).first()
            if device:
                device.firmware_id = deploy.target_firmware_id
                device.last_update = datetime.now(timezone.utc)

        db.commit()
        if rejected_deploy_id is not None:
            Thread(
                target=resend_rejected,
                args=(device_id, rejected_deploy_id),
                daemon=True,
            ).start()

    except Exception as e:
        db.rollback()
        print(f"[{device_id}] DB error: {e}")
    finally:
        db.close()


def get_acceptance_status(serial_number: str, db: Session):
    device = db.query(Device).filter(Device.serial_number == serial_number).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    latest_deploy = (
        db.query(Deploy)
        .filter(Deploy.device_serial == serial_number)
        .order_by(Deploy.timestamp.desc())
        .first()
    )

    if not latest_deploy:
        raise HTTPException(
            status_code=404, detail="No deployments found for this device"
        )

    return {"isAccepted": latest_deploy.isAccepted}

def resend_rejected(device_id: str, deploy_id: int):
    sleep(reject_Delay)
    db = SessionLocal()
    try:
        latest_deploy = (
            db.query(Deploy)
            .filter(Deploy.device_serial == device_id)
            .order_by(Deploy.timestamp.desc())
            .first()
        )
        if not latest_deploy or latest_deploy.id != deploy_id:
            return
        if latest_deploy.isAccepted is not False:
            return
        firmware = (
            db.query(FirmwareUpdate)
            .filter(FirmwareUpdate.id == latest_deploy.target_firmware_id)
            .first()
        )
        connection_str = os.getenv("IOT_CONNECTION")
        if not connection_str:
            print(f"IoT connection string not configured")
            return
        iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)
        firmware_overview = FirmwareOverview(
            id=str(firmware.id),
            device_type=firmware.device_type,
            developer=str(firmware.uploaded_by or ""),
            version_number=firmware.version_number,
            isEmergency=("1" if bool(firmware.isEmergency or latest_deploy.isEmergency) else "0"),
            description=firmware.description or "",
        )
        if not deploy_cloud_to_device(device_id, iot_hub, firmware_overview):
            raise print(f"Failed to resend firmware to {device_id}")
            return
        latest_deploy.isAccepted = None
        db.commit()
    finally:
        db.close()