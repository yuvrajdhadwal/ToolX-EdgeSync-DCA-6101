from database.database import Base, SessionLocal, engine
from database.models import Device, Shop

DEFAULT_SHOPS = [
    {"id": 1, "location": "Houston, USA", "latitude": 29.7604, "longitude": -95.3698},
    {"id": 2, "location": "Calgary, Canada", "latitude": 51.0447, "longitude": -114.0719},
    {"id": 3, "location": "Rio de Janeiro, Brazil", "latitude": -22.9068, "longitude": -43.1729},
    {"id": 4, "location": "Lima, Peru", "latitude": -12.0464, "longitude": -77.0428},
    {"id": 5, "location": "Aberdeen, UK", "latitude": 57.1497, "longitude": -2.0943},
    {"id": 6, "location": "Paris, France", "latitude": 48.8566, "longitude": 2.3522},
    {"id": 7, "location": "Oslo, Norway", "latitude": 59.9139, "longitude": 10.7522},
    {"id": 8, "location": "Lagos, Nigeria", "latitude": 6.5244, "longitude": 3.3792},
    {"id": 9, "location": "Cairo, Egypt", "latitude": 30.0444, "longitude": 31.2357},
    {"id": 10, "location": "Luanda, Angola", "latitude": -8.8390, "longitude": 13.2894},
    {"id": 11, "location": "Dubai, UAE", "latitude": 25.2048, "longitude": 55.2708},
    {"id": 12, "location": "Mumbai, India", "latitude": 19.0760, "longitude": 72.8777},
    {"id": 13, "location": "Jakarta, Indonesia", "latitude": -6.2088, "longitude": 106.8456},
    {"id": 14, "location": "Kuala Lumpur, Malaysia", "latitude": 3.1390, "longitude": 101.6869},
    {"id": 15, "location": "Perth, Australia", "latitude": -31.9505, "longitude": 115.8605},
    {"id": 16, "location": "Auckland, New Zealand", "latitude": -36.8485, "longitude": 174.7633},
    {"id": 17, "location": "Tokyo, Japan", "latitude": 35.6762, "longitude": 139.6503},
    {"id": 18, "location": "Singapore", "latitude": 1.3521, "longitude": 103.8198},
    {"id": 19, "location": "Doha, Qatar", "latitude": 25.2854, "longitude": 51.5310},
    {"id": 20, "location": "Cape Town, South Africa", "latitude": -33.9249, "longitude": 18.4241},
]


def seed_default_shops() -> None:
    db = SessionLocal()
    try:
        existing_ids = {shop_id for (shop_id,) in db.query(Shop.id).all()}
        shops_to_add = [Shop(**shop_data) for shop_data in DEFAULT_SHOPS if shop_data["id"] not in existing_ids]
        if shops_to_add:
            db.add_all(shops_to_add)
            db.commit()
    finally:
        db.close()


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
    seed_default_shops()
    sync_devices_to_shops()
    print("DB initialized")