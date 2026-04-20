from database.database import Base, SessionLocal, engine
from database.models import Device, Shop


def sync_devices_to_shops() -> None:
    db = SessionLocal()
    try:
        shops_by_location = {shop.location: shop for shop in db.query(Shop).all()}
        devices = db.query(Device).all()

        for device in devices:
            if device.shop is not None:
                continue

            shop = shops_by_location.get((device.location or "").strip())
            if shop is None:
                continue

            device.shop = shop

        db.commit()
    finally:
        db.close()

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    sync_devices_to_shops()
    print("DB initialized")