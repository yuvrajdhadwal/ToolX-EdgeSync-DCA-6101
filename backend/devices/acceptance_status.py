import threading
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.models import Deploy, Device


_pending_rejection_comments: set[str] = set()
_pending_rejection_comments_lock = threading.Lock()


def _wait_for_rejection_comment(device_id: str) -> None:
    with _pending_rejection_comments_lock:
        _pending_rejection_comments.add(device_id)


def _consume_rejection_wait(device_id: str) -> bool:
    with _pending_rejection_comments_lock:
        if device_id in _pending_rejection_comments:
            _pending_rejection_comments.remove(device_id)
            return True
        return False


def update_acceptance_status(device_id: str, body: str):
    normalized_body = body.strip()
    if not normalized_body:
        return

    if "Success" in normalized_body:
        accepted = True
    elif normalized_body == "Firmware Deployment Rejection":
        _wait_for_rejection_comment(device_id)
        return
    elif "Rejected" in normalized_body:
        accepted = False
        rejection_comment = None
    elif _consume_rejection_wait(device_id):
        accepted = False
        rejection_comment = normalized_body
    else:
        return

    db = SessionLocal()
    try:
        deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == device_id,
                Deploy.isAccepted.is_(None),
            )
            .order_by(Deploy.timestamp.desc())
            .first()
        )

        if not deploy:
            print(f"[{device_id}] No active deployment found")
            return

        deploy.isAccepted = accepted  # type: ignore
        if not accepted:
            deploy.rejection_comment = rejection_comment  # type: ignore

        if accepted:
            previous = (
                db.query(Deploy)
                .filter(
                    Deploy.device_serial == device_id,
                    Deploy.isActive.is_(True),
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