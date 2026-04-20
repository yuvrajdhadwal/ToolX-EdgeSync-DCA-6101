from typing import Optional
from fastapi import Header, HTTPException
from database.models import DeveloperManager, User, FieldShopProfessional, Shop
from sqlalchemy.orm import Session
from login.authentication import get_authenticated_user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_developer_manager(db: Session):
    managers = db.query(DeveloperManager).all()
    return [{"id": mng.id, "username": mng.username} for mng in managers]

def get_field_shop_professionals(
    db: Session,
    authorization: Optional[str] = Header(default=None),
):
    get_authenticated_user(authorization, db)
    professionals = db.query(FieldShopProfessional).all()
    return [{"id": p.id, "username": p.username} for p in professionals]


def get_shops(
    db: Session,
    authorization: Optional[str] = Header(default=None),
):
    get_authenticated_user(authorization, db)
    shops = db.query(Shop).order_by(Shop.location.asc()).all()
    return [
        {
            "id": shop.id,
            "location": shop.location,
            "latitude": shop.latitude,
            "longitude": shop.longitude,
        }
        for shop in shops
    ]


def get_assigned_devices(
    db: Session,
    authorization: Optional[str] = None,
):
    user = get_authenticated_user(authorization, db)
    professional = db.query(FieldShopProfessional).filter(
        FieldShopProfessional.id == user.id
    ).first()
    if not professional:
        return []
    return [
        {
            "serial_number": d.serial_number,
            "device_type": d.device_type,
            "location": d.location,
            "description": d.description,
            "version_number": d.firmware.version_number if d.firmware else "N/A",
            "last_update": d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A",
            "developer_manager": d.developer_manager or "",
            "latitude": d.latitude,
            "longitude": d.longitude,
        }
        for d in professional.assigned_devices
    ]

def get_username_by_id(user_id: int,
    db: Session,
    authorization: Optional[str] = Header(default=None),):
    get_authenticated_user(authorization, db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username}
