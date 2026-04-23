from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.models import Deploy, Device


def update_acceptance_status(device_id: str, body: str):

    # Two-step rejection logic
    # 1. If body contains 'Rejected', mark as rejected (isAccepted=False)
    # 2. If previous deploy is rejected and has no comment, treat next message as rejection comment
    accepted = None
    rejection_comment = None

    if "Success" in body:
        accepted = True
    elif "Rejected" in body:
        accepted = False
    else:
        # Check if this is a rejection comment for the latest rejected deploy
        db = SessionLocal()
        try:
            deploy = (
                db.query(Deploy)
                .filter(
                    Deploy.device_serial == device_id,
                )
                .order_by(Deploy.timestamp.desc())
                .first()
            )
            print(f"[LOG] [{device_id}] Received message: '{body.strip()}'. Latest deploy status: isAccepted={deploy.isAccepted if deploy else 'N/A'}, rejection_comment={'present' if deploy and deploy.rejection_comment else 'none'}.")
            if deploy and deploy.isAccepted is False and not deploy.rejection_comment:
                deploy.rejection_comment = body.strip()
                db.commit()
                print(f"[LOG] [{device_id}] Saved rejection comment: '{body.strip()}' for deploy id {deploy.id}")
            else:
                print(f"[LOG] [{device_id}] Message received but not saved as rejection comment: '{body.strip()}'")
        except Exception as e:
            db.rollback()
            print(f"[ERROR] [{device_id}] DB error (rejection comment): {e}")
        finally:
            db.close()
        return

    db = SessionLocal()
    try:
        db = SessionLocal()
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
            print(f"[LOG] [{device_id}] Deploy id {deploy.id} marked as {'accepted' if accepted else 'rejected'}.")
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
