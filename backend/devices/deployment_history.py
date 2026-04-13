
from fastapi import Depends, HTTPException
from backend.database.models import Deploy, Device, FirmwareUpdate
from sqlalchemy.orm import Session

def get_deploy_history(serial_number: str,
    db: Session):
    device = db.query(Device).filter(Device.serial_number == serial_number).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    deploys = (
        db.query(Deploy)
        .filter(Deploy.device_serial == serial_number)
        .order_by(Deploy.timestamp.desc())
        .all()
    )

    return [
        {
            "id": d.id,
            "firmware_version": db.query(FirmwareUpdate)
            .filter(FirmwareUpdate.id == d.target_firmware_id)
            .first()
            .version_number,
            "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M"),
            "isActive": d.isActive,
        }
        for d in deploys
    ]