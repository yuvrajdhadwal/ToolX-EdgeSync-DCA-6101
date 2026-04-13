from database.database import SessionLocal
from database.models import Deploy


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

