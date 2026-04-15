from database.database import SessionLocal
from database.models import Deploy, Device
from sqlalchemy.orm import Session
from fastapi import HTTPException



def update_acceptance_status(device_id: str, body: str):
    if "Accepted" in body:
        accepted = True
    elif "Rejected" in body:
        accepted = False
    else:
        return

    db = SessionLocal()
    try:
        deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == device_id,
                Deploy.isActive == True,
                Deploy.isAccepted == None,
            )
            .first()
        )

        if not deploy:
            print(f"[{device_id}] No active deployment found")
            return

        deploy.isAccepted = accepted  # type: ignore
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
        db.query(Deploy).filter(Deploy.device_serial == serial_number).order_by(Deploy.timestamp.desc()).first()
    )

    if not latest_deploy:
        raise HTTPException(status_code=404, detail="No deployments found for this device")
    
    return {"isAccepted": latest_deploy.isAccepted}